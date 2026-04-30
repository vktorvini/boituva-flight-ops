import httpx
from datetime import datetime, timezone, timedelta
import logging
from app.consensus_engine.engine import WeatherSourceData, run_consensus
from app.database import get_db, SessionLocal
from app.models import WeatherRaw, WeatherNormalized, FlightHistorySupabase
from app.agents.decision_engine import compute_and_store_status
import urllib.request
import json

logger = logging.getLogger(__name__)

# Configurações de Localização (Boituva - Centro)
LAT = -23.2833
LON = -47.6667

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=America%2FSao_Paulo"

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
    """Estratégia de Ingestão INMET Definitiva."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://tempo.inmet.gov.br/",
    }
    stations = [("A713", "Ipero"), ("A726", "Piracicaba"), ("A715", "S.M.Arcanjo")]
    now = datetime.now(timezone.utc) - timedelta(hours=3)
    date_str = now.strftime("%Y-%m-%d")

    # Estratégia 1: Tentar dados horários (vários padrões de URL)
    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
        for code, name in stations:
            urls = [
                f"https://apitempo.inmet.gov.br/estacao/dados/{date_str}/{code}",
                f"https://apitempo.inmet.gov.br/estacao/dados/{date_str}/{date_str}/{code}",
            ]
            for url in urls:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and isinstance(data, list):
                            valid = [o for o in data if _safe_float(o.get("VEN_VEL")) is not None]
                            if valid:
                                obs = valid[-1]
                                wind = _safe_float(obs.get("VEN_VEL")) * 3.6
                                gust = _safe_float(obs.get("VEN_RAJ", obs.get("VEN_VEL"))) * 3.6
                                logger.info(f"[INMET] Sucesso {code} via {url}")
                                return WeatherSourceData(
                                    source_name="inmet",
                                    wind_speed=round(wind, 2),
                                    wind_gust=round(gust, 2),
                                    precipitation=_safe_float(obs.get("CHUVA")) or 0.0,
                                    available=True,
                                    obs_time=now
                                )
                except: continue

    # Estratégia 2: Proximidade via urllib
    try:
        prox_url = f"https://apitempo.inmet.gov.br/estacao/proxima/{LAT}/{LON}"
        req = urllib.request.Request(prox_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if data and isinstance(data, dict) and data.get("VEN_VEL") is not None:
                    wind = _safe_float(data.get("VEN_VEL")) * 3.6
                    gust = _safe_float(data.get("VEN_RAJ", data.get("VEN_VEL"))) * 3.6
                    logger.info(f"[INMET] Sucesso via Proximidade (urllib)")
                    return WeatherSourceData(
                        source_name="inmet",
                        wind_speed=round(wind, 2),
                        wind_gust=round(gust, 2),
                        precipitation=_safe_float(data.get("CHUVA")) or 0.0,
                        available=True,
                        obs_time=now
                    )
    except: pass

    return WeatherSourceData(source_name="inmet", available=False, wind_speed=0, wind_gust=0, precipitation=0)

async def _fetch_met_norway() -> WeatherSourceData:
    url = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={LAT}&lon={LON}"
    headers = {"User-Agent": "BoituvaFlightOps/5.0 github.com/vktorvini"}
    try:
        async with httpx.AsyncClient(timeout=10) as cl:
            resp = await cl.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            current = data["properties"]["timeseries"][0]["data"]["instant"]["details"]
            wind_speed = float(current.get("wind_speed", 0)) * 3.6
            wind_gust = float(current.get("wind_speed_of_gust", current.get("wind_speed", 0))) * 3.6
            return WeatherSourceData(
                source_name="met_norway",
                wind_speed=round(wind_speed, 2),
                wind_gust=round(wind_gust, 2),
                precipitation=0.0,
                available=True
            )
    except Exception as e:
        logger.warning(f"[Met Norway] Erro: {e}")
        return WeatherSourceData(source_name="met_norway", available=False, wind_speed=0, wind_gust=0, precipitation=0)

async def fetch_and_store_weather():
    """Pipeline principal de ingestão."""
    async with httpx.AsyncClient(timeout=12) as client:
        try: om = await _fetch_open_meteo(client)
        except: om = WeatherSourceData(source_name="open_meteo", available=False, wind_speed=0, wind_gust=0, precipitation=0)

    try: inmet = await _fetch_inmet()
    except: inmet = WeatherSourceData(source_name="inmet", available=False, wind_speed=0, wind_gust=0, precipitation=0)

    try: met_norway = await _fetch_met_norway()
    except: met_norway = WeatherSourceData(source_name="met_norway", available=False, wind_speed=0, wind_gust=0, precipitation=0)

    sources = [om, inmet, met_norway]
    consensus = run_consensus(sources)

    db = SessionLocal()
    try:
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
        
        try:
            payload = [{"source": s.source_name, "available": s.available, "wind": s.wind_speed, "gust": s.wind_gust} for s in sources]
            history = FlightHistorySupabase(
                timestamp=raw.timestamp,
                status=new_status_record.status,
                risk_score=new_status_record.risk_score,
                wind_speed=consensus.wind_speed,
                wind_gust=consensus.wind_gust,
                precipitation=consensus.precipitation,
                sources_json=payload,
                decision_reasons=new_status_record.reasons
            )
            db.add(history)
            db.commit()
        except: db.rollback()

    except Exception as e:
        logger.error(f"Erro no banco: {e}")
        db.rollback()
    finally:
        db.close()

def _safe_float(value) -> float | None:
    if value in [None, "9999", "////", "", "---"]: return None
    try:
        f = float(str(value).replace(",", "."))
        return f if f >= 0 else None
    except: return None
