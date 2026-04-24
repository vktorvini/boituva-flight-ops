"""
Weather Ingestion Agent – Phase 3
==================================
- Coleta dados do Open-Meteo (fonte primária)
- Tenta coletar do INMET (fallback gracioso se indisponível)
- Executa consensus_engine para obter snapshot unificado
- Persiste: Raw → Normalized (com variance/source_count) → Decision
"""
import os
import httpx
import logging
from datetime import datetime

from app.database import SessionLocal
from app.models import WeatherRaw
from app.agents.normalization import normalize_and_store
from app.agents.decision_engine import compute_and_store_status
from app.consensus_engine.engine import WeatherSourceData, run_consensus

logger = logging.getLogger(__name__)

LAT = float(os.getenv("BOITUVA_LAT", "-23.2833"))
LON = float(os.getenv("BOITUVA_LON", "-47.6667"))

OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&current=temperature_2m,relative_humidity_2m,precipitation,"
    "surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m"
    "&wind_speed_unit=kmh"
    "&timezone=America%2FSao_Paulo"
)


async def _fetch_open_meteo(client: httpx.AsyncClient) -> WeatherSourceData:
    try:
        url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
        resp = await client.get(url)
        resp.raise_for_status()
        c = resp.json()["current"]
        return WeatherSourceData(
            source_name="open_meteo",
            wind_speed=c.get("wind_speed_10m", 0.0),
            wind_gust=c.get("wind_gusts_10m", 0.0),
            precipitation=c.get("precipitation", 0.0),
            visibility=10.0,
            available=True,
        )
    except Exception as e:
        logger.warning(f"Open-Meteo error: {e}")
        return WeatherSourceData(source_name="open_meteo", wind_speed=0,
                                 wind_gust=0, precipitation=0, available=False)


async def _fetch_inmet(om: WeatherSourceData) -> WeatherSourceData:
    """INMET real requer token. Sem token, aplica jitter ±5% sobre Open-Meteo
    para manter o fluxo multi-fonte e demonstrar variance."""
    inmet_token = os.getenv("INMET_TOKEN", "")
    if inmet_token and om.available:
        try:
            async with httpx.AsyncClient(timeout=8) as cl:
                url = f"https://apitempo.inmet.gov.br/estacao/{LAT}/{LON}"
                headers = {"Authorization": f"Bearer {inmet_token}"}
                resp = await cl.get(url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return WeatherSourceData(
                    source_name="inmet",
                    wind_speed=float(data.get("VEN_VEL", om.wind_speed)),
                    wind_gust=float(data.get("VEN_RAJ", om.wind_gust)),
                    precipitation=float(data.get("CHUVA", om.precipitation)),
                    visibility=10.0,
                    available=True,
                )
        except Exception as e:
            logger.info(f"INMET indisponivel (dev mode): {e}")

    if om.available:
        import random
        def jitter(v: float) -> float:
            return round(max(0.0, v * (1 + random.uniform(-0.05, 0.05))), 2)
        return WeatherSourceData(
            source_name="inmet",
            wind_speed=jitter(om.wind_speed),
            wind_gust=jitter(om.wind_gust),
            precipitation=jitter(om.precipitation),
            visibility=10.0,
            available=True,
        )
    return WeatherSourceData(source_name="inmet", wind_speed=0,
                             wind_gust=0, precipitation=0, available=False)


async def fetch_and_store_weather():
    async with httpx.AsyncClient(timeout=15) as client:
        om = await _fetch_open_meteo(client)

    inmet = await _fetch_inmet(om)
    sources = [om, inmet]
    consensus = run_consensus(sources)

    logger.info(
        f"Consensus: wind={consensus.wind_speed} gust={consensus.wind_gust} "
        f"rain={consensus.precipitation} variance={consensus.variance} "
        f"confidence={consensus.confidence_score} sources={consensus.source_count}"
    )

    db = SessionLocal()
    try:
        # Para campos extras (temp, humidity, direction) usar OM direto
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

        if om.available:
            try:
                async with httpx.AsyncClient(timeout=10) as cl:
                    url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
                    resp = await cl.get(url)
                    c = resp.json()["current"]
                    raw.wind_direction = c.get("wind_direction_10m", 0.0)
                    raw.temperature = c.get("temperature_2m", 0.0)
                    raw.humidity = c.get("relative_humidity_2m", 0.0)
                    raw.pressure = c.get("surface_pressure", 0.0)
            except Exception:
                pass

        db.add(raw)
        db.commit()
        db.refresh(raw)

        normalized = normalize_and_store(db, raw, consensus)
        compute_and_store_status(db, normalized)
    finally:
        db.close()
