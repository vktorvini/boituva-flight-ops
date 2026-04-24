"""
Decision Engine Agent
=====================
Responsável por:
  1. Delegar o cálculo à engine pura versionada (decision_engine/v1.py)
  2. Persistir o resultado completo no banco (FlightStatus)

Não contém lógica de negócio – apenas orquestração.
"""
from app.models import WeatherNormalized, FlightStatus
from app.decision_engine.v1 import evaluate


def compute_and_store_status(db, normalized: WeatherNormalized) -> FlightStatus:
    """Chamada pelo pipeline de ingestão após normalização."""
    result = evaluate(
        wind_speed=normalized.wind_speed or 0.0,
        wind_gust=normalized.wind_gust or 0.0,
        precipitation=normalized.precipitation or 0.0,
        visibility=normalized.visibility if normalized.visibility is not None else 10.0,
    )

    record = FlightStatus(
        timestamp=normalized.timestamp,
        status=result["status"],
        risk_score=result["risk_score"],
        reasons=result["reasons"],
        # Phase 2 fields
        risk_model_version=result["risk_model_version"],
        risk_breakdown=result["breakdown"],
        input_snapshot=result["input_snapshot"],
        decision_trace=result["decision_trace"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
