import os
import httpx
from datetime import datetime, timezone

from app.decision_engine.v1 import evaluate
from app.schemas import FlightWindowEntry

LAT = float(os.getenv("BOITUVA_LAT", "-23.2833"))
LON = float(os.getenv("BOITUVA_LON", "-47.6667"))

FORECAST_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&hourly=wind_speed_10m,wind_gusts_10m,precipitation"
    "&models=best_match,gfs_global"
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
    
    # Open-Meteo with multiple models returns keys like wind_speed_10m_best_match and wind_speed_10m_gfs_global
    # if the parameter &models is used.
    
    m1_wind = hourly.get("wind_speed_10m_best_match", hourly.get("wind_speed_10m", []))
    m1_gust = hourly.get("wind_gusts_10m_best_match", hourly.get("wind_gusts_10m", []))
    m1_rain = hourly.get("precipitation_best_match", hourly.get("precipitation", []))

    m2_wind = hourly.get("wind_speed_10m_gfs_global", [])
    m2_gust = hourly.get("wind_gusts_10m_gfs_global", [])
    m2_rain = hourly.get("precipitation_gfs_global", [])

    entries = []

    for i, t in enumerate(times[:48]):
        # Worst case consensus for forecast
        w1 = m1_wind[i] if i < len(m1_wind) else 0
        w2 = m2_wind[i] if i < len(m2_wind) else 0
        g1 = m1_gust[i] if i < len(m1_gust) else 0
        g2 = m2_gust[i] if i < len(m2_gust) else 0
        r1 = m1_rain[i] if i < len(m1_rain) else 0
        r2 = m2_rain[i] if i < len(m2_rain) else 0

        final_wind = max(w1, w2)
        final_gust = max(g1, g2)
        final_rain = max(r1, r2)

        result = evaluate(
            wind_speed=final_wind,
            wind_gust=final_gust,
            precipitation=final_rain,
        )
        
        entries.append(
            FlightWindowEntry(
                hour=t,
                status=result["status"],
                wind_speed=final_wind,
                wind_gust=final_gust,
                precipitation=final_rain,
            )
        )

    return entries
