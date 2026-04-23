import os
import httpx
from datetime import datetime, timezone

from app.agents.decision_engine import evaluate
from app.schemas import FlightWindowEntry

LAT = float(os.getenv("BOITUVA_LAT", "-23.2833"))
LON = float(os.getenv("BOITUVA_LON", "-47.6667"))

FORECAST_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&hourly=wind_speed_10m,wind_gusts_10m,precipitation"
    "&wind_speed_unit=kmh"
    "&forecast_days=2"
    "&timezone=America%2FSao_Paulo"
)


async def get_flight_window():
    url = FORECAST_URL.format(lat=LAT, lon=LON)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    hourly = data["hourly"]
    times = hourly["time"]
    winds = hourly["wind_speed_10m"]
    gusts = hourly["wind_gusts_10m"]
    rains = hourly["precipitation"]

    now = datetime.now(tz=timezone.utc)
    entries = []

    for i, t in enumerate(times[:48]):
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        status, _, _ = evaluate(winds[i], gusts[i], rains[i])
        entries.append(
            FlightWindowEntry(
                hour=t,
                status=status,
                wind_speed=winds[i],
                wind_gust=gusts[i],
                precipitation=rains[i],
            )
        )

    return entries
