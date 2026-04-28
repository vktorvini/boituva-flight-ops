from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WeatherRaw, WeatherNormalized, FlightStatus
from app.schemas import WeatherCurrent, FlightStatusOut, FlightWindowOut, SourceDetail
from app.agents.flight_window import get_flight_window

router = APIRouter()


from datetime import datetime, timezone

@router.get("/clima/atual", response_model=WeatherCurrent)
async def get_current_weather(db: Session = Depends(get_db)):
    record = db.query(WeatherRaw).order_by(WeatherRaw.timestamp.desc()).first()
    
    # Se não tiver dados ou o dado for muito velho (> 10 min), força ingestão imediata
    if not record or (datetime.utcnow() - record.timestamp).total_seconds() > 600:
        from app.agents.weather_ingestion import fetch_and_store_weather
        try:
            await fetch_and_store_weather()
            # Busca de novo após atualizar
            record = db.query(WeatherRaw).order_by(WeatherRaw.timestamp.desc()).first()
        except Exception:
            pass # fallback silencioso em caso de erro na forçada

    if not record:
        raise HTTPException(status_code=404, detail="No weather data available")
    return record


@router.get("/voo/status", response_model=FlightStatusOut)
async def get_flight_status(db: Session = Depends(get_db)):
    status = db.query(FlightStatus).order_by(FlightStatus.timestamp.desc()).first()
    
    # Se não tiver status ou o dado for muito velho (> 10 min), força ingestão imediata
    if not status or (datetime.utcnow() - status.timestamp).total_seconds() > 600:
        from app.agents.weather_ingestion import fetch_and_store_weather
        try:
            await fetch_and_store_weather()
            status = db.query(FlightStatus).order_by(FlightStatus.timestamp.desc()).first()
        except Exception:
            pass

    raw = db.query(WeatherRaw).order_by(WeatherRaw.timestamp.desc()).first()
    normalized = db.query(WeatherNormalized).order_by(WeatherNormalized.timestamp.desc()).first()

    if not status or not raw:
        raise HTTPException(status_code=404, detail="No status data available")

    breakdown = status.risk_breakdown or {}
    confidence = status.confidence
    source_count = normalized.source_count if normalized else None

    # Phase 4: desserializar sources_detail
    sources_detail = None
    if status.sources_detail:
        try:
            sources_detail = [SourceDetail(**s) for s in status.sources_detail]
        except Exception:
            sources_detail = None

    return FlightStatusOut(
        timestamp=status.timestamp,
        status=status.status,
        risk_score=status.risk_score,
        reasons=status.reasons or [],
        wind_speed=raw.wind_speed,
        wind_gust=raw.wind_gust,
        precipitation=raw.precipitation,
        risk_model_version=status.risk_model_version,
        breakdown=breakdown or None,
        confidence=confidence,
        source_count=source_count,
        sources_detail=sources_detail,
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


# ── Alertas & Webhooks ────────────────────────────────────────────────────────
from app.models import AlertHook, AlertLog
from app.schemas import AlertHookCreate, AlertHookOut, AlertLogOut

@router.get("/alertas/logs", response_model=list[AlertLogOut])
def get_alert_logs(limit: int = 20, db: Session = Depends(get_db)):
    logs = db.query(AlertLog).order_by(AlertLog.timestamp.desc()).limit(limit).all()
    return logs

@router.get("/alertas/hooks", response_model=list[AlertHookOut])
def get_alert_hooks(db: Session = Depends(get_db)):
    hooks = db.query(AlertHook).all()
    return hooks

@router.post("/alertas/hooks", response_model=AlertHookOut)
def create_alert_hook(hook: AlertHookCreate, db: Session = Depends(get_db)):
    new_hook = AlertHook(**hook.model_dump())
    db.add(new_hook)
    db.commit()
    db.refresh(new_hook)
    return new_hook

@router.delete("/alertas/hooks/{hook_id}")
def delete_alert_hook(hook_id: int, db: Session = Depends(get_db)):
    hook = db.query(AlertHook).filter(AlertHook.id == hook_id).first()
    if not hook:
        raise HTTPException(status_code=404, detail="Hook not found")
    db.delete(hook)
    db.commit()
    return {"status": "deleted"}

@router.post("/alertas/test")
async def trigger_bot_test(db: Session = Depends(get_db)):
    """Rota para o Botão da App: Engatilha um alerta manual."""
    from app.agents.alert_agent import check_and_notify_status_change
    last_record = db.query(FlightStatus).order_by(FlightStatus.timestamp.desc()).first()
    if not last_record:
        raise HTTPException(status_code=400, detail="Sem historico para simular.")
    
    new_status = "WARNING" if last_record.status == "SAFE" else "SAFE"
    fake_record = FlightStatus(
        timestamp=last_record.timestamp,
        status=new_status,
        risk_score=99.0 if new_status != "SAFE" else 5.0,
        reasons=[f"Teste forçado via App: {last_record.status} para {new_status}"],
        confidence=1.0,
        sources_detail=[]
    )
    db.add(fake_record)
    db.commit()
    db.refresh(fake_record)
    
    await check_and_notify_status_change(db, fake_record)
    
    db.delete(fake_record)
    db.commit()
    return {"status": "Teste engatilhado com sucesso!"}
