import os
import httpx
import logging
from datetime import datetime

from app.database import SessionLocal
from app.models import WeatherRaw
from app.agents.normalization import normalize_and_store
from app.agents.decision_engine import compute_and_store_status

logger = logging.getLogger(__name__)

# Boituva, SP coordinates
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


async def fetch_and_store_weather():
    url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    c = data["current"]

    db = SessionLocal()
    try:
        raw = WeatherRaw(
            timestamp=datetime.utcnow(),
            wind_speed=c.get("wind_speed_10m", 0.0),
            wind_gust=c.get("wind_gusts_10m", 0.0),
            wind_direction=c.get("wind_direction_10m", 0.0),
            temperature=c.get("temperature_2m", 0.0),
            humidity=c.get("relative_humidity_2m", 0.0),
            pressure=c.get("surface_pressure", 0.0),
            precipitation=c.get("precipitation", 0.0),
        )
        db.add(raw)
        db.commit()
        db.refresh(raw)
        logger.info(f"Raw weather stored: wind={raw.wind_speed} gust={raw.wind_gust} rain={raw.precipitation}")

        normalized = normalize_and_store(db, raw)
        compute_and_store_status(db, normalized)
    finally:
        db.close()
