"""
Decision Engine v1.0 – Boituva Flight Ops
==========================================
Pure, deterministic, side-effect-free function.
Fully aligned with spec_phase2.md and decision_engine_spec.md.

Risk Model v1.0
---------------
Normalization:
  W = min((wind_speed / 30) * 100, 100)
  G = min((wind_gust  / 40) * 100, 100)
  P = min((precipitation / 5) * 100, 100)
  V = max(0, (1 - (visibility / 10)) * 100)

Weighted score:
  risk_score = W*0.4 + G*0.3 + P*0.2 + V*0.1

Classification:
  0–30   → SAFE
  31–60  → WARNING
  61–100 → PROHIBITED

Hard rules (override classification):
  precipitation > 2  → PROHIBITED
  wind_gust     > 35 → PROHIBITED
"""

from __future__ import annotations

RISK_MODEL_VERSION = "v1.0"

# ── classification thresholds ────────────────────────────────────────────────
SAFE_MAX = 30.0
WARNING_MAX = 60.0

# ── hard rule thresholds ─────────────────────────────────────────────────────
RAIN_HARD_LIMIT = 2.0    # mm
GUST_HARD_LIMIT = 35.0   # km/h


def _normalize(wind_speed: float, wind_gust: float,
               precipitation: float, visibility: float) -> dict:
    """Return normalised 0-100 components per spec."""
    W = min((wind_speed / 30.0) * 100.0, 100.0)
    G = min((wind_gust / 40.0) * 100.0, 100.0)
    P = min((precipitation / 5.0) * 100.0, 100.0)
    V = max(0.0, (1.0 - (visibility / 10.0)) * 100.0)
    return {"W": round(W, 2), "G": round(G, 2), "P": round(P, 2), "V": round(V, 2)}


def _classify(score: float) -> str:
    if score <= SAFE_MAX:
        return "SAFE"
    if score <= WARNING_MAX:
        return "WARNING"
    return "PROHIBITED"


def evaluate(
    wind_speed: float,
    wind_gust: float,
    precipitation: float,
    visibility: float = 10.0,   # default: perfect visibility
) -> dict:
    """
    Core decision function – pure and versionable.

    Returns:
        {
          "risk_score": float,
          "status": str,
          "risk_model_version": str,
          "breakdown": dict,
          "reasons": list[str],
          "input_snapshot": dict,
          "decision_trace": dict,
        }
    """
    # ── normalise ─────────────────────────────────────────────────────────────
    components = _normalize(wind_speed, wind_gust, precipitation, visibility)
    W, G, P, V = components["W"], components["G"], components["P"], components["V"]

    # ── weighted score ────────────────────────────────────────────────────────
    raw_score = W * 0.4 + G * 0.3 + P * 0.2 + V * 0.1
    risk_score = round(raw_score, 2)

    # ── classify by score ─────────────────────────────────────────────────────
    status = _classify(risk_score)

    # ── hard rules ────────────────────────────────────────────────────────────
    hard_rules_fired: list[str] = []
    if precipitation > RAIN_HARD_LIMIT:
        status = "PROHIBITED"
        hard_rules_fired.append(f"hard_rule:precipitation>{RAIN_HARD_LIMIT}mm ({precipitation:.1f} mm)")
    if wind_gust > GUST_HARD_LIMIT:
        status = "PROHIBITED"
        hard_rules_fired.append(f"hard_rule:wind_gust>{GUST_HARD_LIMIT}km/h ({wind_gust:.1f} km/h)")

    # ── reasons (human-readable) ─────────────────────────────────────────────
    reasons: list[str] = []

    if status == "PROHIBITED":
        if precipitation > RAIN_HARD_LIMIT:
            reasons.append(f"Chuva acima do limite crítico: {precipitation:.1f} mm")
        elif precipitation > 0:
            reasons.append(f"Precipitação detectada: {precipitation:.1f} mm")
        if wind_gust > GUST_HARD_LIMIT:
            reasons.append(f"Rajada acima do limite crítico: {wind_gust:.1f} km/h")
        elif wind_gust > 25:
            reasons.append(f"Rajada excessiva: {wind_gust:.1f} km/h")
        if wind_speed > 20:
            reasons.append(f"Vento excessivo: {wind_speed:.1f} km/h")
        if not reasons:
            reasons.append(f"Nível de risco proibitivo: {risk_score:.0f}/100")

    elif status == "WARNING":
        if wind_speed > 15:
            reasons.append(f"Vento elevado: {wind_speed:.1f} km/h")
        if wind_gust > 20:
            reasons.append(f"Rajada elevada: {wind_gust:.1f} km/h")
        if visibility < 5:
            reasons.append(f"Visibilidade reduzida: {visibility:.1f} km")
        if not reasons:
            reasons.append(f"Condições moderadas – atenção requerida (risco {risk_score:.0f}/100)")

    else:  # SAFE
        reasons.append("Condições favoráveis para operação de voo")
        if risk_score > 10:
            reasons.append(f"Monitoramento recomendado (risco {risk_score:.0f}/100)")

    # ── confidence (proxy: based on visibility and precipitation) ─────────────
    confidence = round(1.0 - (P / 200.0) - (V / 300.0), 2)
    confidence = max(0.0, min(1.0, confidence))

    return {
        "risk_score": risk_score,
        "status": status,
        "risk_model_version": RISK_MODEL_VERSION,
        "confidence": confidence,
        "breakdown": {
            "wind_component": W,
            "gust_component": G,
            "precipitation_component": P,
            "visibility_component": V,
            "weight_wind": 0.4,
            "weight_gust": 0.3,
            "weight_precipitation": 0.2,
            "weight_visibility": 0.1,
            "weighted_score": risk_score,
        },
        "reasons": reasons,
        "input_snapshot": {
            "wind_speed": wind_speed,
            "wind_gust": wind_gust,
            "precipitation": precipitation,
            "visibility": visibility,
        },
        "decision_trace": {
            "score_before_hard_rules": round(raw_score, 2),
            "classification_by_score": _classify(raw_score),
            "hard_rules_fired": hard_rules_fired,
            "final_status": status,
        },
    }
