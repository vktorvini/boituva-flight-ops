from app.models import WeatherNormalized, FlightStatus


def evaluate(wind: float, gust: float, rain: float):
    reasons = []
    status = "SAFE"
    risk = 0.0

    # PROHIBITED rules
    if rain > 0:
        reasons.append(f"Chuva detectada: {rain:.1f} mm")
        status = "PROHIBITED"
        risk = max(risk, 1.0)

    if wind > 20:
        reasons.append(f"Vento excessivo: {wind:.1f} km/h")
        status = "PROHIBITED"
        risk = max(risk, 1.0)

    if gust > 25:
        reasons.append(f"Rajada excessiva: {gust:.1f} km/h")
        status = "PROHIBITED"
        risk = max(risk, 1.0)

    # WARNING rules (only if not already PROHIBITED)
    if status != "PROHIBITED":
        if wind > 15:
            reasons.append(f"Vento elevado: {wind:.1f} km/h")
            status = "WARNING"
            risk = max(risk, 0.6)

        if gust > 20:
            reasons.append(f"Rajada elevada: {gust:.1f} km/h")
            status = "WARNING"
            risk = max(risk, 0.6)

    if status == "SAFE":
        risk = round(wind / 40, 2)
        reasons.append("Condições favoráveis para voo")

    return status, round(risk, 2), reasons


def compute_and_store_status(db, normalized: WeatherNormalized) -> FlightStatus:
    status, risk, reasons = evaluate(
        normalized.wind_speed,
        normalized.wind_gust,
        normalized.precipitation,
    )

    record = FlightStatus(
        timestamp=normalized.timestamp,
        status=status,
        risk_score=risk,
        reasons=reasons,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
