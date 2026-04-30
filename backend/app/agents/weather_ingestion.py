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
    "https://apitempo.inmet.gov.br/estacao/dados/{inicio}/{fim}/{codigo}"
)


async def _fetch_open_meteo(client: httpx.AsyncClient) -> WeatherSourceData:
    try:
        url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        c = resp.json()["current"]
        
        data = WeatherSourceData(
            source_name="open_meteo",
            wind_speed=float(c.get("wind_speed_10m") or 0.0),
            wind_gust=float(c.get("wind_gusts_10m") or 0.0),
            precipitation=float(c.get("precipitation") or 0.0),
            available=True,
            extra_data={
                "wind_direction": float(c.get("wind_direction_10m") or 0.0),
                "temperature": float(c.get("temperature_2m") or 0.0),
                "humidity": float(c.get("relative_humidity_2m") or 0.0),
                "pressure": float(c.get("surface_pressure") or 0.0),
            }
        )
        logger.info(f"[Open-Meteo] Sucesso: wind={data.wind_speed} gust={data.wind_gust}")
        return data
    except Exception as e:
        logger.warning(f"[Open-Meteo] Erro na coleta: {e}")
        return WeatherSourceData(source_name="open_meteo", available=False, wind_speed=0, wind_gust=0, precipitation=0)


async def _fetch_inmet() -> WeatherSourceData:
    """
    Busca dados do INMET com fallback de data e múltiplas estações.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    
    # Prioridade de estações
    stations = [("A713", "Ipero"), ("A726", "Piracicaba"), ("A715", "S.M.Arcanjo")]
    
    # Janelas de tempo (tentar hoje, se não der, tentar ontem)
    now = datetime.now(timezone.utc) - timedelta(hours=3) # BRT
    dates = [now.strftime("%Y-%m-%d"), (now - timedelta(days=1)).strftime("%Y-%m-%d")]

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for code, name in stations:
            for d in dates:
                # Tenta dois formatos de URL conhecidos do INMET
                urls = [
                    f"https://apitempo.inmet.gov.br/estacao/dados/{d}/{d}/{code}",
                    f"https://apitempo.inmet.gov.br/estacao/{d}/{d}/{code}"
                ]
                
                for url in urls:
                    try:
                        resp = await client.get(url, headers=headers)
                        if resp.status_code != 200:
                            continue
                            
                        data = resp.json()
                        if not data or not isinstance(data, list):
                            continue
                            
                        # Pega a última medição que tenha vento
                        valid = [o for o in data if _safe_float(o.get("VEN_VEL")) is not None]
                        if not valid:
                            continue
                            
                        obs = valid[-1]
                        wind = _safe_float(obs.get("VEN_VEL")) * 3.6
                        gust = _safe_float(obs.get("VEN_RAJ", obs.get("VEN_VEL"))) * 3.6
                        rain = _safe_float(obs.get("CHUVA")) or 0.0
                        
                        logger.info(f"[INMET] Sucesso: {code} ({name}) wind={wind:.1f} gust={gust:.1f}")
                        return WeatherSourceData(
                            source_name="inmet",
                            wind_speed=round(wind, 2),
                            wind_gust=round(gust, 2),
                            precipitation=round(rain, 2),
                            available=True,
                            obs_time=datetime.strptime(f"{obs.get('DT_MEDICAO')} {obs.get('HR_MEDICAO')}", "%Y-%m-%d %H%M") if obs.get('DT_MEDICAO') else None
                        )
                    except Exception:
                        continue
                        
    logger.warning("[INMET] Nenhuma estação disponível.")
    return WeatherSourceData(source_name="inmet", available=False, wind_speed=0, wind_gust=0, precipitation=0)


def _safe_float(value) -> float | None:
    if value in [None, "9999", "////", "", "---"]:
        return None
    try:
        f = float(str(value).replace(",", "."))
        return f if f >= 0 else None
    except:
        return None


async def _fetch_met_norway() -> WeatherSourceData:
    """
    Busca dados secundários do MET Norway (yr.no)
    Não exige chave de API, mas exige User-Agent amigável.
    """
    url = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={LAT}&lon={LON}"
    headers = {"User-Agent": "BoituvaFlightOps/5.0 github.com/vktorvini"}
    try:
        async with httpx.AsyncClient(timeout=10) as cl:
            resp = await cl.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            
            # Navegar na estrutura do Met Norway
            current = data["properties"]["timeseries"][0]["data"]["instant"]["details"]
            
            # Em km/h (Met Norway retorna em m/s)
            wind_speed = float(current.get("wind_speed", 0)) * 3.6
            wind_gust = float(current.get("wind_speed_of_gust", current.get("wind_speed", 0))) * 3.6
            
            # Precipitação (vem da próxima 1h)
            try:
                next_1h = data["properties"]["timeseries"][0]["data"]["next_1_hours"]["details"]
                precipitation = float(next_1h.get("precipitation_amount", 0.0))
            except (KeyError, IndexError):
                precipitation = 0.0

            logger.info(f"[MetNorway] wind={wind_speed:.1f} gust={wind_gust:.1f} rain={precipitation}")
            
            return WeatherSourceData(
                source_name="met_norway",
                wind_speed=round(wind_speed, 2),
                wind_gust=round(wind_gust, 2),
                precipitation=round(precipitation, 2),
                visibility=10.0,
                available=True,
            )
    except Exception as e:
        logger.warning(f"[MetNorway] Erro na coleta: {e}")
        return WeatherSourceData(
            source_name="met_norway",
            wind_speed=0, wind_gust=0, precipitation=0, available=False,
        )


async def fetch_and_store_weather():
    """Pipeline principal de ingestão."""
    # Executar coletas de forma isolada
    async with httpx.AsyncClient(timeout=12) as client:
        try:
            om = await _fetch_open_meteo(client)
        except Exception as e:
            logger.error(f"Erro fatal no Open-Meteo: {e}")
            om = WeatherSourceData(source_name="open_meteo", available=False, wind_speed=0, wind_gust=0, precipitation=0)

    try:
        inmet = await _fetch_inmet()
    except Exception as e:
        logger.error(f"Erro fatal no INMET: {e}")
        inmet = WeatherSourceData(source_name="inmet", available=False, wind_speed=0, wind_gust=0, precipitation=0)

    try:
        met_norway = await _fetch_met_norway()
    except Exception as e:
        logger.error(f"Erro fatal no MetNorway: {e}")
        met_norway = WeatherSourceData(source_name="met_norway", available=False, wind_speed=0, wind_gust=0, precipitation=0)

    sources = [om, inmet, met_norway]
    consensus = run_consensus(sources)

    logger.info(
        f"[Consensus] wind={consensus.wind_speed} gust={consensus.wind_gust} "
        f"rain={consensus.precipitation} sources={consensus.sources_used}"
    )

    db = SessionLocal()
    try:
        # 1. Salvar Raw (Legado/Compatibilidade)
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
        if om.available and om.extra_data:
            raw.wind_direction = om.extra_data.get("wind_direction", 0.0)
            raw.temperature = om.extra_data.get("temperature", 0.0)
            raw.humidity = om.extra_data.get("humidity", 0.0)
            raw.pressure = om.extra_data.get("pressure", 0.0)

        db.add(raw)
        db.commit()

        # 2. Normalizar e Gerar Status
        normalized = WeatherNormalized(
            timestamp=raw.timestamp,
            wind_speed=raw.wind_speed,
            wind_gust=raw.wind_gust,
            precipitation=raw.precipitation,
            visibility=raw.visibility,
            variance=consensus.variance,
            source_count=consensus.source_count
        )
        db.add(normalized)
        db.commit()

        new_status_record = compute_and_store_status(db, normalized, consensus)
        
        db.commit()

        # Agente 7 (Alert Agent) checa a mudança e notifica
        from app.agents.alert_agent import check_and_notify_status_change
        await check_and_notify_status_change(db, new_status_record)

    finally:
        db.close()
