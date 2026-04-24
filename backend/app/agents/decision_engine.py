"""
Decision Engine Agent – Phase 3
================================
Delega o cálculo para decision_engine/v1.py.
Passa variance do normalized para o uncertainty factor.
Persiste confidence no FlightStatus.
"""
from app.models import WeatherNormalized, FlightStatus
from app.decision_engine.v1 import evaluate


def compute_and_store_status(db, normalized: WeatherNormalized) -> FlightStatus:
    result = evaluate(
        wind_speed=normalized.wind_speed or 0.0,
        wind_gust=normalized.wind_gust or 0.0,
        precipitation=normalized.precipitation or 0.0,
        visibility=normalized.visibility if normalized.visibility is not None else 10.0,
        variance=normalized.variance if normalized.variance is not None else 0.0,
    )

    record = FlightStatus(
        timestamp=normalized.timestamp,
        status=result["status"],
        risk_score=result["risk_score"],
        reasons=result["reasons"],
        risk_model_version=result["risk_model_version"],
        risk_breakdown=result["breakdown"],
        input_snapshot=result["input_snapshot"],
        decision_trace=result["decision_trace"],
        # Phase 3
        confidence=result["confidence"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
