"""
Weather Ingestion Agent — Boituva Flight Ops
=============================================
Responsabilidades:
  - Coletar dados de Open-Meteo (primária, tempo-real)
  - Coletar dados de Met Norway (secundária, validação)
  - Coletar dados do INMET (histórica, apenas contexto — delay de horas)
  - Normalizar para km/h e mm
  - Isolar falhas: falha de uma fonte NÃO derruba o sistema
  - Persistir no banco com log estruturado

Unidades obrigatórias de saída:
  - wind_speed: km/h
  - wind_gust:  km/h
  - precipitation: mm
"""

import httpx
import json
import logging
import traceback
import urllib.request
from datetime import datetime, timezone, timedelta

from app.consensus_engine.engine import WeatherSourceData, run_consensus
from app.database import SessionLocal
from app.models import WeatherRaw, WeatherNormalized, FlightHistorySupabase
from app.agents.decision_engine import compute_and_store_status

logger = logging.getLogger(__name__)

# ── Configurações de Localização ──────────────────────────────────────────────
LAT: float = -23.2833
LON: float = -47.6667

# ── URLs ──────────────────────────────────────────────────────────────────────
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&current=temperature_2m,relative_humidity_2m,precipitation,"
    "surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
    "&timezone=America%2FSao_Paulo"
    "&wind_speed_unit=kmh"  # Solicitar diretamente em km/h
)
MET_NORWAY_URL = (
    "https://api.met.no/weatherapi/locationforecast/2.0/compact"
    "?lat={lat}&lon={lon}"
)
INMET_STATIONS = [("A713", "Ipero/SP"), ("A726", "Piracicaba/SP"), ("A715", "S.M.Arcanjo/SP")]
INMET_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://tempo.inmet.gov.br/",
}


# ── Helper ────────────────────────────────────────────────────────────────────

def _safe_float(value) -> float | None:
    """Converte valor para float, ignorando tokens inválidos do INMET."""
    if value in (None, "9999", "////", "", "---", "null"):
        return None
    try:
        f = float(str(value).replace(",", "."))
        return f if f >= 0 else None
    except (ValueError, TypeError):
        return None


# ── Fonte 1: Open-Meteo (Primária — Tempo Real) ───────────────────────────────

async def _fetch_open_meteo(client: httpx.AsyncClient) -> WeatherSourceData:
    """
    Open-Meteo fornece vento em km/h quando wind_speed_unit=kmh é passado.
    Dados quase em tempo real (modelo NWP, atualizado a cada hora).
    """
    url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
    try:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        c = resp.json()["current"]

        wind_speed = float(c.get("wind_speed_10m") or 0.0)    # já em km/h
        wind_gust  = float(c.get("wind_gusts_10m") or 0.0)    # já em km/h
        rain       = float(c.get("precipitation") or 0.0)

        logger.info(f"[Open-Meteo] wind={wind_speed:.1f}km/h gust={wind_gust:.1f}km/h rain={rain:.1f}mm")

        return WeatherSourceData(
            source_name="open_meteo",
            wind_speed=round(wind_speed, 2),
            wind_gust=round(wind_gust, 2),
            precipitation=round(rain, 2),
            available=True,
            extra_data={
                "wind_direction": float(c.get("wind_direction_10m") or 0.0),
                "temperature":    float(c.get("temperature_2m") or 0.0),
                "humidity":       float(c.get("relative_humidity_2m") or 0.0),
                "pressure":       float(c.get("surface_pressure") or 0.0),
            },
        )
    except Exception as e:
        logger.warning(f"[Open-Meteo] Falha: {e}")
        return WeatherSourceData(source_name="open_meteo", available=False,
                                 wind_speed=0, wind_gust=0, precipitation=0)


# ── Fonte 2: Met Norway (Secundária — Modelo Global) ─────────────────────────

async def _fetch_met_norway(client: httpx.AsyncClient) -> WeatherSourceData:
    """
    Met Norway (yr.no) retorna vento em m/s. Converte para km/h (*3.6).
    Não requer API key. User-Agent amigável obrigatório.
    """
    url = MET_NORWAY_URL.format(lat=LAT, lon=LON)
    headers = {"User-Agent": "BoituvaFlightOps/6.0 github.com/vktorvini"}
    try:
        resp = await client.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        details = data["properties"]["timeseries"][0]["data"]["instant"]["details"]

        wind_speed = float(details.get("wind_speed", 0)) * 3.6   # m/s → km/h
        wind_gust  = float(details.get("wind_speed_of_gust", details.get("wind_speed", 0))) * 3.6

        # Precipitação da próxima 1h (campo separado)
        rain = 0.0
        try:
            rain = float(
                data["properties"]["timeseries"][0]["data"]
                .get("next_1_hours", {}).get("details", {}).get("precipitation_amount", 0) or 0
            )
        except Exception:
            pass

        logger.info(f"[Met Norway]  wind={wind_speed:.1f}km/h gust={wind_gust:.1f}km/h rain={rain:.1f}mm")

        return WeatherSourceData(
            source_name="met_norway",
            wind_speed=round(wind_speed, 2),
            wind_gust=round(wind_gust, 2),
            precipitation=round(rain, 2),
            available=True,
        )
    except Exception as e:
        logger.warning(f"[Met Norway] Falha: {e}")
        return WeatherSourceData(source_name="met_norway", available=False,
                                 wind_speed=0, wind_gust=0, precipitation=0)


# ── Fonte 3: NOAA (GFS via Open-Meteo) (Real-time Model) ───────────────────

async def _fetch_noaa(client: httpx.AsyncClient) -> WeatherSourceData:
    """
    Usa o modelo GFS (Global Forecast System) da NOAA através da API do Open-Meteo.
    """
    url = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&current=wind_speed_10m,wind_gusts_10m,precipitation&models=gfs_seamless"
    try:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        current = data["current"]

        wind_speed = float(current.get("wind_speed_10m", 0))
        wind_gust = float(current.get("wind_gusts_10m", wind_speed))
        rain = float(current.get("precipitation", 0))

        logger.info(f"[NOAA/GFS]  wind={wind_speed:.1f}km/h gust={wind_gust:.1f}km/h rain={rain:.1f}mm")

        return WeatherSourceData(
            source_name="noaa",
            wind_speed=round(wind_speed, 2),
            wind_gust=round(wind_gust, 2),
            precipitation=round(rain, 2),
            available=True,
        )
    except Exception as e:
        logger.warning(f"[NOAA/GFS] Falha: {e}")
        return WeatherSourceData(source_name="noaa", available=False,
                                 wind_speed=0, wind_gust=0, precipitation=0)


# ── Fonte 4: INMET (Histórica — contexto, NÃO para decisão imediata) ─────────

async def _fetch_inmet(client: httpx.AsyncClient) -> WeatherSourceData:
    """
    INMET é usado APENAS como dado histórico/contextual.
    Possui delay de horas. NÃO deve ser a única fonte de decisão.
    VEN_VEL e VEN_RAJ estão em m/s → converter para km/h (*3.6).
    CHUVA já está em mm.
    """
    now_brt = datetime.now(timezone.utc) - timedelta(hours=3)
    dates = [now_brt.strftime("%Y-%m-%d"), (now_brt - timedelta(days=1)).strftime("%Y-%m-%d")]

    # Estratégia 1: httpx — endpoint de dados horários
    for code, name in INMET_STATIONS:
        for d in dates:
            for url in [
                f"https://apitempo.inmet.gov.br/estacao/dados/{d}/{code}",
                f"https://apitempo.inmet.gov.br/estacao/dados/{d}/{d}/{code}",
            ]:
                try:
                    resp = await client.get(url, headers=INMET_HEADERS, timeout=10)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and isinstance(data, list):
                            valid = [o for o in data if _safe_float(o.get("VEN_VEL")) is not None]
                            if valid:
                                obs = valid[-1]
                                wind = _safe_float(obs["VEN_VEL"]) * 3.6   # m/s → km/h
                                gust = (_safe_float(obs.get("VEN_RAJ")) or _safe_float(obs["VEN_VEL"])) * 3.6
                                rain = _safe_float(obs.get("CHUVA")) or 0.0
                                logger.info(f"[INMET/{code}] wind={wind:.1f}km/h gust={gust:.1f}km/h rain={rain:.1f}mm (histórico de {d})")
                                return WeatherSourceData(
                                    source_name="inmet",
                                    wind_speed=round(wind, 2),
                                    wind_gust=round(gust, 2),
                                    precipitation=round(rain, 2),
                                    available=True,
                                    obs_time=now_brt,
                                )
                except Exception as e:
                    logger.debug(f"[INMET/{code}] Falha em {url}: {e}")
                    continue

    # Estratégia 2: urllib fallback (ignora SSL issues do httpx)
    for code, name in INMET_STATIONS:
        for d in dates:
            url = f"https://apitempo.inmet.gov.br/estacao/dados/{d}/{d}/{code}"
            try:
                req = urllib.request.Request(url, headers=INMET_HEADERS)
                with urllib.request.urlopen(req, timeout=8) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode("utf-8"))
                        if data and isinstance(data, list):
                            valid = [o for o in data if _safe_float(o.get("VEN_VEL")) is not None]
                            if valid:
                                obs = valid[-1]
                                wind = _safe_float(obs["VEN_VEL"]) * 3.6
                                gust = (_safe_float(obs.get("VEN_RAJ")) or _safe_float(obs["VEN_VEL"])) * 3.6
                                rain = _safe_float(obs.get("CHUVA")) or 0.0
                                logger.info(f"[INMET/{code}] (urllib) wind={wind:.1f}km/h gust={gust:.1f}km/h")
                                return WeatherSourceData(
                                    source_name="inmet",
                                    wind_speed=round(wind, 2),
                                    wind_gust=round(gust, 2),
                                    precipitation=round(rain, 2),
                                    available=True,
                                    obs_time=now_brt,
                                )
            except Exception as e:
                logger.debug(f"[INMET/{code}] urllib falhou: {e}")
                continue

    logger.warning("[INMET] Todas as estações indisponíveis — fonte marcada como offline.")
    return WeatherSourceData(source_name="inmet", available=False,
                             wind_speed=0, wind_gust=0, precipitation=0)


# ── Pipeline Principal ────────────────────────────────────────────────────────

async def fetch_and_store_weather() -> None:
    """
    Pipeline de ingestão completo.
    1. Coleta Open-Meteo (primária) e Met Norway (secundária) em paralelo.
    2. Tenta INMET (histórica) de forma isolada.
    3. Executa consensus worst-case.
    4. Persiste no banco (WeatherRaw → WeatherNormalized → FlightStatus → FlightHistory).
    """
    logger.info("━━━ Ciclo de Ingestão Iniciado ━━━")

    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
        # Fontes primárias (tempo real)
        try:
            om = await _fetch_open_meteo(client)
        except Exception:
            logger.critical(f"[Open-Meteo] Erro inesperado:\n{traceback.format_exc()}")
            om = WeatherSourceData(source_name="open_meteo", available=False,
                                   wind_speed=0, wind_gust=0, precipitation=0)

        try:
            norway = await _fetch_met_norway(client)
        except Exception:
            logger.critical(f"[Met Norway] Erro inesperado:\n{traceback.format_exc()}")
            norway = WeatherSourceData(source_name="met_norway", available=False,
                                       wind_speed=0, wind_gust=0, precipitation=0)

        try:
            noaa = await _fetch_noaa(client)
        except Exception:
            logger.critical(f"[NOAA/GFS] Erro inesperado:\n{traceback.format_exc()}")
            noaa = WeatherSourceData(source_name="noaa", available=False,
                                     wind_speed=0, wind_gust=0, precipitation=0)

        # Fonte histórica (INMET)
        try:
            inmet = await _fetch_inmet(client)
        except Exception:
            logger.warning(f"[INMET] Erro inesperado:\n{traceback.format_exc()}")
            inmet = WeatherSourceData(source_name="inmet", available=False,
                                      wind_speed=0, wind_gust=0, precipitation=0)

    sources = [om, norway, noaa, inmet]

    # Log do consenso
    available_names = [s.source_name for s in sources if s.available]
    logger.info(f"[Ingestão] Fontes disponíveis: {available_names}")

    consensus = run_consensus(sources)
    logger.info(
        f"[Consensus] wind={consensus.wind_speed}km/h gust={consensus.wind_gust}km/h "
        f"rain={consensus.precipitation}mm variance={consensus.variance} "
        f"confidence={consensus.confidence_score} sources={consensus.source_count}"
    )

    if consensus.source_count == 0:
        logger.error("[Ingestão] ZERO fontes disponíveis — abortando persistência.")
        return

    db = SessionLocal()
    try:
        # 1. WeatherRaw
        raw = WeatherRaw(
            timestamp=datetime.utcnow(),
            wind_speed=consensus.wind_speed,
            wind_gust=consensus.wind_gust,
            wind_direction=om.extra_data.get("wind_direction", 0.0) if om.available else 0.0,
            temperature=om.extra_data.get("temperature", 0.0) if om.available else 0.0,
            humidity=om.extra_data.get("humidity", 0.0) if om.available else 0.0,
            pressure=om.extra_data.get("pressure", 0.0) if om.available else 0.0,
            precipitation=consensus.precipitation,
            visibility=consensus.visibility,
        )
        db.add(raw)
        db.commit()

        # 2. WeatherNormalized
        normalized = WeatherNormalized(
            timestamp=raw.timestamp,
            wind_speed=raw.wind_speed,
            wind_gust=raw.wind_gust,
            wind_direction=raw.wind_direction,
            precipitation=raw.precipitation,
            visibility=raw.visibility,
            variance=consensus.variance,
            source_count=consensus.source_count,
        )
        db.add(normalized)
        db.commit()

        # 3. FlightStatus
        status_record = compute_and_store_status(db, normalized, consensus)
        logger.info(f"[Decisão] {status_record.status} | risk={status_record.risk_score:.0f}%")

        # 4. FlightHistorySupabase (análise histórica)
        try:
            from app.agents.wind_direction_agent import degrees_to_cardinal
            sources_dict = {}
            for s in sources:
                sources_dict[s.source_name] = {
                    "available": s.available,
                    "wind_kmh": s.wind_speed,
                    "gust_kmh": s.wind_gust,
                    "rain_mm": s.precipitation,
                }
            
            payload = {
                "flag": status_record.status,
                "wind_speed": consensus.wind_speed,
                "wind_gust": consensus.wind_gust,
                "direction": degrees_to_cardinal(raw.wind_direction) if raw.wind_direction is not None else "N/A",
                "sources": sources_dict
            }
            
            history = FlightHistorySupabase(
                timestamp=raw.timestamp,
                flag=status_record.status,
                wind_speed=consensus.wind_speed,
                wind_gust=consensus.wind_gust,
                wind_direction=raw.wind_direction,
                precipitation=consensus.precipitation,
                confidence=status_record.confidence or 0.0,
                variance=normalized.variance or 0.0,
                sources_json=payload,
            )
            db.add(history)
            db.commit()
        except Exception as e:
            logger.error(f"[Histórico] Falha ao salvar FlightHistorySupabase: {e}")
            db.rollback()

        logger.info("━━━ Ciclo de Ingestão Concluído com Sucesso ━━━")

    except Exception as e:
        logger.critical(f"[Pipeline] ERRO CRÍTICO:\n{traceback.format_exc()}")
        db.rollback()
    finally:
        db.close()
