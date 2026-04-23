from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WeatherRaw, FlightStatus
from app.schemas import WeatherCurrent, FlightStatusOut, FlightWindowOut
from app.agents.flight_window import get_flight_window

router = APIRouter()


@router.get("/clima/atual", response_model=WeatherCurrent)
def get_current_weather(db: Session = Depends(get_db)):
    record = db.query(WeatherRaw).order_by(WeatherRaw.timestamp.desc()).first()
    if not record:
        raise HTTPException(status_code=404, detail="No weather data available")
    return record


@router.get("/voo/status", response_model=FlightStatusOut)
def get_flight_status(db: Session = Depends(get_db)):
    status = db.query(FlightStatus).order_by(FlightStatus.timestamp.desc()).first()
    raw = db.query(WeatherRaw).order_by(WeatherRaw.timestamp.desc()).first()

    if not status or not raw:
        raise HTTPException(status_code=404, detail="No status data available")

    return FlightStatusOut(
        timestamp=status.timestamp,
        status=status.status,
        risk_score=status.risk_score,
        reasons=status.reasons,
        wind_speed=raw.wind_speed,
        wind_gust=raw.wind_gust,
        precipitation=raw.precipitation,
    )


@router.get("/voo/janela", response_model=FlightWindowOut)
async def get_flight_window_route():
    entries = await get_flight_window()
    return FlightWindowOut(window=entries)


@router.get("/voo/historico")
def get_history(limit: int = 48, db: Session = Depends(get_db)):
    records = (
        db.query(FlightStatus)
        .order_by(FlightStatus.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": r.timestamp,
            "status": r.status,
            "risk_score": r.risk_score,
            "reasons": r.reasons,
        }
        for r in records
    ]


@router.get("/health")
def health():
    return {"status": "ok"}
