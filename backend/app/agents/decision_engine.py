"""
Decision Engine Agent – Boituva Flight Ops
==========================================
Passa o ConsensusResult para o motor de decisão v1 e persiste o FlightStatus.
"""
from app.models import WeatherNormalized, FlightStatus
from app.decision_engine.v1 import evaluate
from app.consensus_engine.engine import ConsensusResult


def _serialize_sources(consensus: ConsensusResult | None) -> list | None:
    """Serializa per_source_results para JSON-safe list."""
    if not consensus or not consensus.per_source_results:
        return None
    result = []
    for sr in consensus.per_source_results:
        result.append({
            "source_name":  sr.source_name,
            "label":        sr.label,
            "available":    sr.available,
            "wind_speed":   sr.wind_speed,
            "wind_gust":    sr.wind_gust,
            "precipitation":sr.precipitation,
            "visibility":   sr.visibility,
            "risk_score":   sr.risk_score,
            "status":       sr.status,
            "reasons":      sr.reasons,
            "weight":       sr.weight,
        })
    return result


def compute_and_store_status(
    db, normalized: WeatherNormalized, consensus: ConsensusResult | None = None
) -> FlightStatus:
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
        confidence=result["confidence"],
        sources_detail=_serialize_sources(consensus),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
