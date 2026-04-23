from app.models import WeatherRaw, WeatherNormalized


def compute_confidence(raw: WeatherRaw) -> float:
    """Simple confidence: 1.0 if all critical fields present and plausible."""
    score = 1.0
    if raw.wind_speed is None or raw.wind_speed < 0:
        score -= 0.3
    if raw.wind_gust is None or raw.wind_gust < 0:
        score -= 0.3
    if raw.precipitation is None or raw.precipitation < 0:
        score -= 0.2
    if raw.humidity is None or not (0 <= raw.humidity <= 100):
        score -= 0.2
    return max(0.0, round(score, 2))


def normalize_and_store(db, raw: WeatherRaw) -> WeatherNormalized:
    normalized = WeatherNormalized(
        timestamp=raw.timestamp,
        wind_speed=max(0.0, raw.wind_speed or 0.0),
        wind_gust=max(0.0, raw.wind_gust or 0.0),
        precipitation=max(0.0, raw.precipitation or 0.0),
        confidence_score=compute_confidence(raw),
    )
    db.add(normalized)
    db.commit()
    db.refresh(normalized)
    return normalized
