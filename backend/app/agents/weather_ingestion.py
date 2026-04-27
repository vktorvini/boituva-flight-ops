"""
Weather Ingestion Agent – Phase 4
==================================
- Coleta dados do Open-Meteo (fonte primária, sempre)
- Coleta dados do INMET Estação A713/Ipero (~17km de Boituva) via API pública
  URL: https://apitempo.inmet.gov.br/estacao/dados/{inicio}/{fim}/A713
  SEM token, SEM fallback genérico.
  PRINCÍPIO: se não há dados reais → available=False → não entra no consensus.
- Executa consensus_engine para obter snapshot unificado
- Persiste: Raw → Normalized (com variance/source_count) → Decision
"""
import os
import httpx
import logging
from datetime import datetime, timezone, timedelta

from app.database import SessionLocal
from app.models import WeatherRaw
from app.agents.normalization import normalize_and_store
from app.agents.decision_engine import compute_and_store_status
from app.consensus_engine.engine import WeatherSourceData, run_consensus

logger = logging.getLogger(__name__)

LAT = float(os.getenv("BOITUVA_LAT", "-23.2833"))
LON = float(os.getenv("BOITUVA_LON", "-47.6667"))

# Estação INMET mais próxima de Boituva: A713 – Ipero/SP (~17km)
INMET_STATION_CODE = os.getenv("INMET_STATION_CODE", "A713")
INMET_STATION_NAME = os.getenv("INMET_STATION_NAME", "Ipero")

OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&current=temperature_2m,relative_humidity_2m,precipitation,"
    "surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m"
    "&wind_speed_unit=kmh"
    "&timezone=America%2FSao_Paulo"
)

# API pública INMET – sem autenticação
# Retorna lista de observações horárias de uma estação automática
INMET_DADOS_URL = (
    "https://apitempo.inmet.gov.br/estacao/{inicio}/{fim}/{codigo}"
)


async def _fetch_open_meteo(client: httpx.AsyncClient) -> WeatherSourceData:
    try:
        url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
        resp = await client.get(url, timeout=15)
        resp.raise_for_status()
        c = resp.json()["current"]
        return WeatherSourceData(
            source_name="open_meteo",
            wind_speed=float(c.get("wind_speed_10m") or 0.0),
            wind_gust=float(c.get("wind_gusts_10m") or 0.0),
            precipitation=float(c.get("precipitation") or 0.0),
            visibility=10.0,
            available=True,
        )
    except Exception as e:
        logger.warning(f"[Open-Meteo] Erro na coleta: {e}")
        return WeatherSourceData(
            source_name="open_meteo",
            wind_speed=0, wind_gust=0, precipitation=0, available=False,
        )


async def _fetch_inmet() -> WeatherSourceData:
    """
    Busca dados reais das estações INMET mais próximas de Boituva.
    Estações tentadas em ordem de proximidade:
      1. A713 – Ipero/SP (~17km)
      2. A726 – Piracicaba/SP (~64km)
      3. A715 – São Miguel Arcanjo/SP (~65km)

    API pública sem token: /estacao/{inicio}/{fim}/{codigo}
    Tenta janelas: hoje, ontem, 2 dias atrás.

    PRINCÍPIO: sem dados reais → available=False.
    NUNCA usa fallback genérico (jitter) ou dados simulados.
    """
    now_utc = datetime.now(timezone.utc)
    now_brt = now_utc + timedelta(hours=-3)

    # Estações em ordem de preferência (mais próxima primeiro)
    station_priority = [
        ("A713", "Ipero/SP ~17km"),
        ("A726", "Piracicaba/SP ~64km"),
        ("A715", "São Miguel Arcanjo/SP ~65km"),
    ]

    # Janelas de tempo: tenta hoje, ontem e 2 dias atrás
    date_windows = [
        (
            (now_brt - timedelta(days=1)).strftime("%Y-%m-%d"),
            now_brt.strftime("%Y-%m-%d"),
        ),
        (
            (now_brt - timedelta(days=2)).strftime("%Y-%m-%d"),
            (now_brt - timedelta(days=1)).strftime("%Y-%m-%d"),
        ),
    ]

    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; BoituvaFlightOps/4.0)",
        "Referer": "https://tempo.inmet.gov.br/",
    }

    for station_code, station_label in station_priority:
        for inicio, fim in date_windows:
            url = INMET_DADOS_URL.format(inicio=inicio, fim=fim, codigo=station_code)
            logger.debug(f"[INMET] Tentando: {url}")
            try:
                async with httpx.AsyncClient(timeout=12) as cl:
                    resp = await cl.get(url, headers=headers)

                # 204 ou resposta vazia = sem dados nessa janela
                if resp.status_code == 204:
                    logger.debug(f"[INMET/{station_code}] 204 sem dados ({inicio}→{fim})")
                    continue

                resp.raise_for_status()

                try:
                    data = resp.json()
                except Exception:
                    logger.debug(f"[INMET/{station_code}] Resposta não-JSON")
                    continue

                if not data or not isinstance(data, list):
                    logger.debug(f"[INMET/{station_code}] Lista vazia")
                    continue

                # Pegar a observação mais recente com dados de vento
                obs = None
                for entry in reversed(data):
                    if entry.get("VEN_VEL") is not None:
                        obs = entry
                        break

                if obs is None:
                    logger.debug(f"[INMET/{station_code}] Sem VEN_VEL na resposta")
                    continue

                wind_speed = _safe_float(obs.get("VEN_VEL"))
                wind_gust = _safe_float(obs.get("VEN_RAJ"))
                precipitation = _safe_float(obs.get("CHUVA"))

                if wind_speed is None:
                    logger.debug(f"[INMET/{station_code}] VEN_VEL inválido")
                    continue

                logger.info(
                    f"[INMET/{station_code}/{station_label}] "
                    f"wind={wind_speed} gust={wind_gust} rain={precipitation} "
                    f"obs={obs.get('DT_MEDICAO','?')} {obs.get('HR_MEDICAO','?')}"
                )

                return WeatherSourceData(
                    source_name="inmet",
                    wind_speed=wind_speed,
                    wind_gust=wind_gust if wind_gust is not None else wind_speed,
                    precipitation=precipitation if precipitation is not None else 0.0,
                    visibility=10.0,
                    available=True,
                )

            except httpx.HTTPStatusError as e:
                logger.debug(f"[INMET/{station_code}] HTTP {e.response.status_code}")
                continue
            except Exception as e:
                logger.debug(f"[INMET/{station_code}] Erro: {type(e).__name__}: {e}")
                continue

    logger.warning(
        "[INMET] Nenhuma estação retornou dados reais. "
        "Fonte marcada como indisponível (sem dados fabricados)."
    )
    return _inmet_unavailable()


def _inmet_unavailable() -> WeatherSourceData:
    """Retorna fonte INMET marcada como indisponível. Sem dados fabricados."""
    return WeatherSourceData(
        source_name="inmet",
        wind_speed=0, wind_gust=0, precipitation=0, available=False,
    )


def _safe_float(value) -> float | None:
    """Converte valor para float, retorna None se inválido."""
    if value is None:
        return None
    try:
        f = float(str(value).replace(",", "."))
        return f if f >= 0 else None
    except (ValueError, TypeError):
        return None


async def fetch_and_store_weather():
    """Pipeline principal de ingestão."""
    async with httpx.AsyncClient(timeout=15) as client:
        om = await _fetch_open_meteo(client)

    inmet = await _fetch_inmet()

    sources = [om, inmet]
    consensus = run_consensus(sources)

    logger.info(
        f"[Consensus] wind={consensus.wind_speed} gust={consensus.wind_gust} "
        f"rain={consensus.precipitation} variance={consensus.variance} "
        f"confidence={consensus.confidence_score} sources={consensus.sources_used}"
    )

    db = SessionLocal()
    try:
        # Campos extras (temp, humidity, direction) só existem no Open-Meteo
        raw = WeatherRaw(
            timestamp=datetime.utcnow(),
            wind_speed=consensus.wind_speed,
            wind_gust=consensus.wind_gust,
            wind_direction=0.0,
            temperature=0.0,
            humidity=0.0,
            pressure=0.0,
            precipitation=consensus.precipitation,
            visibility=consensus.visibility,
        )

        # Enriquecer com campos extras do Open-Meteo se disponível
        if om.available:
            try:
                async with httpx.AsyncClient(timeout=10) as cl:
                    url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
                    resp = await cl.get(url)
                    c = resp.json()["current"]
                    raw.wind_direction = float(c.get("wind_direction_10m") or 0.0)
                    raw.temperature = float(c.get("temperature_2m") or 0.0)
                    raw.humidity = float(c.get("relative_humidity_2m") or 0.0)
                    raw.pressure = float(c.get("surface_pressure") or 0.0)
            except Exception:
                pass

        db.add(raw)
        db.commit()
        db.refresh(raw)

        normalized = normalize_and_store(db, raw, consensus)
        compute_and_store_status(db, normalized, consensus)

    finally:
        db.close()
