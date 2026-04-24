"""
Normalization Agent – Phase 3
==============================
Aceita ConsensusResult (Phase 3) e persiste variance + source_count.
Retrocompatível: consensus=None → comportamento Phase 2.
"""
from __future__ import annotations
from app.models import WeatherRaw, WeatherNormalized


def compute_confidence(raw: WeatherRaw) -> float:
    score = 1.0
    if raw.wind_speed is None or raw.wind_speed < 0:
        score -= 0.3
    if raw.wind_gust is None or raw.wind_gust < 0:
        score -= 0.3
    if raw.precipitation is None or raw.precipitation < 0:
        score -= 0.2
    if raw.humidity is None or not (0 <= (raw.humidity or 0) <= 100):
        score -= 0.2
    return max(0.0, round(score, 2))


def normalize_and_store(db, raw: WeatherRaw, consensus=None) -> WeatherNormalized:
    confidence = consensus.confidence_score if consensus else compute_confidence(raw)
    variance = consensus.variance if consensus else None
    source_count = consensus.source_count if consensus else 1

    normalized = WeatherNormalized(
        timestamp=raw.timestamp,
        wind_speed=max(0.0, raw.wind_speed or 0.0),
        wind_gust=max(0.0, raw.wind_gust or 0.0),
        precipitation=max(0.0, raw.precipitation or 0.0),
        confidence_score=confidence,
        visibility=raw.visibility,
        variance=variance,
        source_count=source_count,
    )
    db.add(normalized)
    db.commit()
    db.refresh(normalized)
    return normalized
