"""
Decision Engine Agent – Boituva Flight Ops (Phase 5)
=====================================================
Passa o ConsensusResult para o motor de decisão v1 e persiste o FlightStatus.

Regra GLOBAL (Phase 5):
  Se ANY fonte individual for unsafe → final_status = PROHIBITED
  Isso SOBRESCREVE a classificação do risk_score.
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
            "is_safe":      sr.is_safe,
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

    final_status = result["status"]
    final_reasons = list(result["reasons"])

    # ── Phase 5: Regra GLOBAL — qualquer fonte unsafe → PROHIBITED ────────
    if consensus and consensus.any_unsafe:
        final_status = "PROHIBITED"
        # Adicionar motivos das fontes unsafe
        unsafe_reasons = []
        for sr in consensus.per_source_results:
            if sr.available and not sr.is_safe:
                for reason in sr.reasons:
                    unsafe_reasons.append(f"[{sr.source_name}] {reason}")
        
        if unsafe_reasons:
            final_reasons = unsafe_reasons + [f"Consenso: {consensus.unsafe_sources}/{consensus.source_count} fontes indicam risco"]
        else:
            final_reasons.append(f"Consenso: fonte(s) indicam condições inseguras")

    # Ajustar confidence com base nas fontes
    final_confidence = result["confidence"]
    if consensus:
        final_confidence = consensus.confidence_score

    record = FlightStatus(
        timestamp=normalized.timestamp,
        status=final_status,
        risk_score=result["risk_score"],
        wind_direction=normalized.wind_direction,
        reasons=final_reasons,
        risk_model_version=result["risk_model_version"],
        risk_breakdown=result["breakdown"],
        input_snapshot=result["input_snapshot"],
        decision_trace={
            **result["decision_trace"],
            "source_level_override": consensus.any_unsafe if consensus else False,
            "safe_sources": consensus.safe_sources if consensus else 0,
            "unsafe_sources": consensus.unsafe_sources if consensus else 0,
            "total_sources": consensus.total_sources if consensus else 0,
        },
        confidence=final_confidence,
        sources_detail=_serialize_sources(consensus),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
