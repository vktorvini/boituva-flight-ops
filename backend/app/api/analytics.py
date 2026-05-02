"""
Analytics API routes — Boituva Flight Ops
==========================================
Endpoints para análise histórica de decisões de voo.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import FlightStatus

analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])


@analytics_router.get("/resumo")
def get_analytics_summary(days: int = 30, db: Session = Depends(get_db)):
    """
    Retorna um resumo das decisões de voo dos últimos N dias.
    Responde: contagem por flag, taxa percentual, médias de risco.
    """
    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(FlightStatus)
        .filter(FlightStatus.timestamp >= since)
        .all()
    )

    total = len(records)
    if total == 0:
        return {
            "period_days": days,
            "total_records": 0,
            "safe": 0, "warning": 0, "prohibited": 0,
            "safe_pct": 0, "warning_pct": 0, "prohibited_pct": 0,
            "avg_risk_score": 0,
            "max_risk_score": 0,
        }

    safe       = sum(1 for r in records if r.status == "SAFE")
    warning    = sum(1 for r in records if r.status == "WARNING")
    prohibited = sum(1 for r in records if r.status == "PROHIBITED")
    avg_risk   = round(sum(r.risk_score for r in records) / total, 1)
    max_risk   = round(max(r.risk_score for r in records), 1)

    return {
        "period_days": days,
        "total_records": total,
        "safe":       safe,
        "warning":    warning,
        "prohibited": prohibited,
        "safe_pct":       round(safe / total * 100, 1),
        "warning_pct":    round(warning / total * 100, 1),
        "prohibited_pct": round(prohibited / total * 100, 1),
        "avg_risk_score": avg_risk,
        "max_risk_score": max_risk,
    }


@analytics_router.get("/diario")
def get_daily_analytics(days: int = 30, db: Session = Depends(get_db)):
    """
    Retorna contagem por status agrupado por dia (últimos N dias).
    Útil para gráficos de barras/linha no frontend.
    """
    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(FlightStatus)
        .filter(FlightStatus.timestamp >= since)
        .order_by(FlightStatus.timestamp.asc())
        .all()
    )

    # Agrupar por data
    by_day: dict[str, dict] = {}
    for r in records:
        day_key = r.timestamp.strftime("%Y-%m-%d")
        if day_key not in by_day:
            by_day[day_key] = {"date": day_key, "safe": 0, "warning": 0, "prohibited": 0, "total": 0, "risk_scores": []}
        by_day[day_key][r.status.lower()] += 1
        by_day[day_key]["total"] += 1
        by_day[day_key]["risk_scores"].append(r.risk_score)

    result = []
    for day_key in sorted(by_day.keys()):
        d = by_day[day_key]
        scores = d.pop("risk_scores")
        d["avg_risk"] = round(sum(scores) / len(scores), 1) if scores else 0
        result.append(d)

    return {"period_days": days, "days": result}
