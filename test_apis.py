import asyncio
import httpx
from datetime import datetime, timezone, timedelta
import logging

logging.basicConfig(level=logging.DEBUG)

LAT = -23.2833
LON = -47.6667
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&current=temperature_2m,relative_humidity_2m,precipitation,"
    "surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m"
    "&wind_speed_unit=kmh"
    "&timezone=America%2FSao_Paulo"
)

async def test_om():
    async with httpx.AsyncClient() as client:
        try:
            url = OPEN_METEO_URL.format(lat=LAT, lon=LON)
            print("URL:", url)
            resp = await client.get(url)
            resp.raise_for_status()
            print("OM SUCCESS:", resp.json()["current"])
        except Exception as e:
            print("OM FAIL:", type(e), e)

async def test_inmet():
    now_utc = datetime.now(timezone.utc)
    now_brt = now_utc + timedelta(hours=-3)
    station_code = "A713"
    
    date_windows = [
        (now_brt.strftime("%Y-%m-%d"), now_brt.strftime("%Y-%m-%d")),
        ((now_brt - timedelta(days=1)).strftime("%Y-%m-%d"), now_brt.strftime("%Y-%m-%d")),
        ((now_brt - timedelta(days=2)).strftime("%Y-%m-%d"), (now_brt - timedelta(days=1)).strftime("%Y-%m-%d")),
    ]
    INMET_DADOS_URL = "https://apitempo.inmet.gov.br/estacao/dados/{inicio}/{fim}/{codigo}"
    headers = {"Accept": "application/json"}
    
    async with httpx.AsyncClient() as cl:
        for inicio, fim in date_windows:
            url = INMET_DADOS_URL.format(inicio=inicio, fim=fim, codigo=station_code)
            print("INMET URL:", url)
            try:
                resp = await cl.get(url, headers=headers)
                print("INMET STATUS:", resp.status_code)
                if resp.status_code == 200:
                    data = resp.json()
                    print("INMET DATA LENGTH:", len(data) if isinstance(data, list) else type(data))
                    break
            except Exception as e:
                print("INMET FAIL:", type(e), e)

asyncio.run(test_om())
asyncio.run(test_inmet())
