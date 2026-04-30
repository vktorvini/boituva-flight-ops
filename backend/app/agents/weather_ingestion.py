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
            extra_data={
                "wind_direction": float(c.get("wind_direction_10m") or 0.0),
                "temperature": float(c.get("temperature_2m") or 0.0),
                "humidity": float(c.get("relative_humidity_2m") or 0.0),
                "pressure": float(c.get("surface_pressure") or 0.0),
            }
        )
    except Exception as e:
        logger.warning(f"[Open-Meteo] Erro na coleta: {e}")
        return WeatherSourceData(
            source_name="open_meteo",
            wind_speed=0, wind_gust=0, precipitation=0, available=False,
        )


async def _fetch_inmet() -> WeatherSourceData:
    now_utc = datetime.now(timezone.utc)
    now_brt = now_utc + timedelta(hours=-3)

    station_priority = [
        ("A713", "Ipero/SP ~17km"),
        ("A726", "Piracicaba/SP ~64km"),
        ("A715", "São Miguel Arcanjo/SP ~65km"),
    ]

    date_windows = [
        (now_brt.strftime("%Y-%m-%d"), now_brt.strftime("%Y-%m-%d")),
        ((now_brt - timedelta(days=1)).strftime("%Y-%m-%d"), now_brt.strftime("%Y-%m-%d")),
        ((now_brt - timedelta(days=2)).strftime("%Y-%m-%d"), (now_brt - timedelta(days=1)).strftime("%Y-%m-%d")),
    ]

    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; BoituvaFlightOps/5.0)",
        "Referer": "https://tempo.inmet.gov.br/",
    }

    def _parse_datetime(obs):
        try:
            return datetime.strptime(f"{obs.get('DT_MEDICAO')} {obs.get('HR_MEDICAO')}", "%Y-%m-%d %H%M")
        except:
            return datetime.min

    for station_code, station_label in station_priority:
        for inicio, fim in date_windows:
            url = INMET_DADOS_URL.format(inicio=inicio, fim=fim, codigo=station_code)
            logger.debug(f"[INMET] Tentando: {url}")

            try:
                async with httpx.AsyncClient(timeout=12) as cl:
                    resp = await cl.get(url, headers=headers)

                if resp.status_code == 204:
                    continue
                resp.raise_for_status()

                try:
                    data = resp.json()
                except:
                    continue

                if not data or not isinstance(data, list):
                    continue

                # Filtrar apenas dados válidos
                valid_obs = []
                for o in data:
                    wind = _safe_float(o.get("VEN_VEL"))
                    if wind is not None:
                        valid_obs.append(o)

                if not valid_obs:
                    continue

                # Ordenar por data
                valid_obs.sort(key=_parse_datetime)
                obs = valid_obs[-1]

                wind_speed = _safe_float(obs.get("VEN_VEL"))
                wind_gust = _safe_float(obs.get("VEN_RAJ"))
                precipitation = _safe_float(obs.get("CHUVA"))

                if wind_speed is None:
                    continue

                # Conversão m/s -> km/h
                wind_speed *= 3.6
                if wind_gust is not None:
                    wind_gust *= 3.6
                else:
                    wind_gust = wind_speed

                precipitation = precipitation if precipitation is not None else 0.0

                # Sanity check Priority 6
                if wind_speed > 150 or wind_gust > 150:
                    logger.warning(f"[INMET] Ignorando valor absurdo: {wind_speed} / {wind_gust}")
                    continue

                # Validar Priority 6
                if wind_gust < wind_speed:
                    wind_gust = wind_speed

                obs_time = _parse_datetime(obs)
                logger.info(f"[INMET] wind={wind_speed:.1f} gust={wind_gust:.1f} rain={precipitation} (Estação: {station_code} às {obs_time})")

                return WeatherSourceData(
                    source_name="inmet",
                    wind_speed=round(wind_speed, 2),
                    wind_gust=round(wind_gust, 2),
                    precipitation=round(precipitation, 2),
                    visibility=10.0,
                    available=True,
                )

            except httpx.HTTPStatusError as e:
                logger.debug(f"[INMET/{station_code}] HTTP {e.response.status_code}")
                continue
            except Exception as e:
                logger.debug(f"[INMET/{station_code}] erro: {type(e).__name__}: {e}")
                continue

    logger.warning("[INMET] Nenhuma estação retornou dados reais.")
    return _inmet_unavailable("no_station_data")


def _inmet_unavailable(reason: str = "no_data") -> WeatherSourceData:
    logger.debug(f"[INMET] unavailable: {reason}")
    return WeatherSourceData(
        source_name="inmet",
        wind_speed=0, wind_gust=0, precipitation=0, available=False
    )


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
    async with httpx.AsyncClient(timeout=15) as client:
        om = await _fetch_open_meteo(client)

    inmet = await _fetch_inmet()
    met_norway = await _fetch_met_norway()

    sources = [om, inmet, met_norway]
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
        if om.available and om.extra_data:
            raw.wind_direction = om.extra_data.get("wind_direction", 0.0)
            raw.temperature = om.extra_data.get("temperature", 0.0)
            raw.humidity = om.extra_data.get("humidity", 0.0)
            raw.pressure = om.extra_data.get("pressure", 0.0)

        db.add(raw)
        db.commit()
        db.refresh(raw)

        normalized = normalize_and_store(db, raw, consensus)
        
        # Agente 3 processa a decisão
        new_status_record = compute_and_store_status(db, normalized, consensus)
        
        # Priority 10: Persistência no Supabase para Histórico
        from app.models import FlightHistorySupabase
        sources_json = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "location": "Boituva",
            "decision": {
                "flag": new_status_record.status,
                "reason": new_status_record.reasons[0] if new_status_record.reasons else "Consenso Seguro",
                "confidence": new_status_record.confidence,
                "variance": normalized.variance
            },
            "consensus": {
                "wind_speed": consensus.wind_speed,
                "wind_gust": consensus.wind_gust,
                "precipitation": consensus.precipitation,
                "sources_used": consensus.source_count
            },
            "sources": []
        }

        for source in sources:
            src_dict = {
                "name": source.source_name,
                "available": source.available,
                "wind_speed": source.wind_speed,
                "wind_gust": source.wind_gust,
                "precipitation": source.precipitation
            }
            if source.source_name == "inmet":
                src_dict["station"] = "A713" # Assumimos a mais provável
                if getattr(source, "obs_time", None):
                    src_dict["obs_time"] = source.obs_time.isoformat()
                else:
                    src_dict["obs_time"] = None
            sources_json["sources"].append(src_dict)

        supabase_record = FlightHistorySupabase(
            timestamp=datetime.now(timezone.utc),
            flag=new_status_record.status,
            wind_speed=consensus.wind_speed,
            wind_gust=consensus.wind_gust,
            precipitation=consensus.precipitation,
            confidence=new_status_record.confidence,
            variance=normalized.variance,
            sources_json=sources_json
        )
        db.add(supabase_record)
        db.commit()

        # Agente 7 (Alert Agent) checa a mudança e notifica
        from app.agents.alert_agent import check_and_notify_status_change
        await check_and_notify_status_change(db, new_status_record)

    finally:
        db.close()
