"""
Consensus Engine – Phase 5 (Hybrid)
=====================================
Evolução do motor de consenso para modelo híbrido:

1. Avaliação POR FONTE (source-level safety):
   - Cada fonte é avaliada individualmente com hard limits
   - is_safe: True/False por fonte

2. Regra GLOBAL: Se QUALQUER fonte for unsafe → PROHIBITED

3. Confidence = safe_sources / total_sources

4. Worst-case mantido como fallback para o risk_score

Pesos das Fontes:
  INMET       → 0.5  (estação real, histórica)
  Met Norway  → 0.4  (modelo global robusto)
  Open-Meteo  → 0.3  (modelo global NWP)
  NOAA        → 0.3  (GFS via Open-Meteo)
"""

from __future__ import annotations
import statistics
from datetime import datetime
from dataclasses import dataclass, field
from typing import List, Optional

# ── Pesos por fonte ────────────────────────────────────────────────────────────
SOURCE_WEIGHTS: dict[str, float] = {
    "inmet": 0.5,
    "met_norway": 0.4,
    "open_meteo": 0.3,
    "noaa": 0.3,
}

SOURCE_LABELS: dict[str, str] = {
    "inmet": "INMET – Estação A713 (Ipero/SP, ~17km)",
    "met_norway": "Met Norway (Instituto Norueguês global)",
    "open_meteo": "Open-Meteo (modelo global – Boituva)",
    "noaa": "NOAA GFS (Global Forecast System)",
}

# ── Hard limits para avaliação por fonte ──────────────────────────────────────
SOURCE_WIND_LIMIT = 16.0     # km/h
SOURCE_GUST_LIMIT = 22.0     # km/h
SOURCE_RAIN_LIMIT = 0.0      # mm (qualquer chuva = unsafe)


@dataclass
class WeatherSourceData:
    """Dados brutos de uma fonte meteorológica."""
    source_name: str              # "open_meteo" | "inmet" | "met_norway" | "noaa"
    wind_speed: float             # km/h
    wind_gust: float              # km/h
    precipitation: float          # mm
    visibility: float = 10.0      # km (padrão: visibilidade perfeita)
    available: bool = True        # False se a fonte falhou/não tem dados reais
    obs_time: Optional[datetime] = None  # Timestamp real da observação
    extra_data: dict = field(default_factory=dict)


@dataclass
class SourceResult:
    """Resultado individual de avaliação para uma fonte."""
    source_name: str
    label: str
    available: bool
    wind_speed: float
    wind_gust: float
    precipitation: float
    visibility: float
    risk_score: Optional[float]   # None se indisponível
    status: Optional[str]         # None se indisponível
    is_safe: bool                 # True se todos os limites estão dentro
    reasons: List[str] = field(default_factory=list)
    weight: float = 0.0


@dataclass
class ConsensusResult:
    """Snapshot unificado pós-consenso."""
    wind_speed: float
    wind_gust: float
    precipitation: float
    visibility: float
    variance: float
    confidence_score: float
    source_count: int
    total_sources: int
    safe_sources: int
    unsafe_sources: int
    any_unsafe: bool              # True se pelo menos 1 fonte é unsafe
    sources_used: List[str] = field(default_factory=list)
    per_source_results: List[SourceResult] = field(default_factory=list)


def _worst_case_max(values: list[float]) -> float:
    if not values:
        return 0.0
    return max(values)

def _worst_case_min(values: list[float]) -> float:
    if not values:
        return 10.0
    return min(values)


def _variance_across(values: list[float]) -> float:
    """Variância amostral normalizada 0-100."""
    if len(values) < 2:
        return 0.0
    var = statistics.variance(values)
    return round(min(var, 100.0), 2)


def _confidence_from_sources(safe_count: int, total_count: int, variance: float) -> float:
    """Confidence = safe_sources / total_sources, penalizado pela variância."""
    if total_count == 0:
        return 0.1
    source_confidence = safe_count / total_count
    variance_penalty = min(variance / 200.0, 0.3)
    return round(max(0.1, min(1.0, source_confidence - variance_penalty)), 2)


def _evaluate_source_safety(source: WeatherSourceData) -> SourceResult:
    """
    Avalia uma fonte individualmente:
    - Aplica hard limits (vento > 16, rajada > 22, chuva > 0)
    - Calcula risk_score via decision engine v1
    - Determina is_safe
    """
    from app.decision_engine.v1 import evaluate

    label = SOURCE_LABELS.get(source.source_name, source.source_name)
    weight = SOURCE_WEIGHTS.get(source.source_name, 0.1)

    if not source.available:
        return SourceResult(
            source_name=source.source_name,
            label=label,
            available=False,
            wind_speed=0.0,
            wind_gust=0.0,
            precipitation=0.0,
            visibility=10.0,
            risk_score=None,
            status=None,
            is_safe=True,  # Fonte offline não conta como unsafe
            reasons=["Fonte indisponível – dados reais não obtidos"],
            weight=weight,
        )

    # Avaliação individual via decision engine
    result = evaluate(
        wind_speed=source.wind_speed,
        wind_gust=source.wind_gust,
        precipitation=source.precipitation,
        visibility=source.visibility,
        variance=0.0,
    )

    # Avaliação de segurança por fonte (hard limits)
    is_safe = True
    safety_reasons: list[str] = []

    if source.wind_speed > SOURCE_WIND_LIMIT:
        is_safe = False
        safety_reasons.append(f"Vento {source.wind_speed:.1f} km/h > limite {SOURCE_WIND_LIMIT}")
    if source.wind_gust > SOURCE_GUST_LIMIT:
        is_safe = False
        safety_reasons.append(f"Rajada {source.wind_gust:.1f} km/h > limite {SOURCE_GUST_LIMIT}")
    if source.precipitation > SOURCE_RAIN_LIMIT:
        is_safe = False
        safety_reasons.append(f"Chuva {source.precipitation:.1f} mm detectada")

    return SourceResult(
        source_name=source.source_name,
        label=label,
        available=True,
        wind_speed=source.wind_speed,
        wind_gust=source.wind_gust,
        precipitation=source.precipitation,
        visibility=source.visibility,
        risk_score=result["risk_score"],
        status=result["status"],
        is_safe=is_safe,
        reasons=safety_reasons if not is_safe else result["reasons"],
        weight=weight,
    )


def run_consensus(sources: List[WeatherSourceData]) -> ConsensusResult:
    """
    Motor de consenso híbrido (Phase 5):

    1. Avaliar cada fonte individualmente (is_safe)
    2. Regra GLOBAL: qualquer fonte unsafe → flag any_unsafe
    3. Worst-case para valores numéricos (fallback)
    4. Confidence = safe_sources / total_sources
    5. Variância para detecção de divergência
    """
    # Passo 1: Resultado por fonte
    per_source_results = [_evaluate_source_safety(s) for s in sources]

    # Passo 2: Filtrar disponíveis
    available = [s for s in sources if s.available]
    available_results = [r for r in per_source_results if r.available]

    if not available:
        return ConsensusResult(
            wind_speed=0.0, wind_gust=0.0, precipitation=0.0,
            visibility=10.0, variance=100.0, confidence_score=0.1,
            source_count=0, total_sources=len(sources),
            safe_sources=0, unsafe_sources=0, any_unsafe=False,
            sources_used=[], per_source_results=per_source_results,
        )

    # Passo 3: Contagem de segurança
    safe_count = sum(1 for r in available_results if r.is_safe)
    unsafe_count = sum(1 for r in available_results if not r.is_safe)
    any_unsafe = unsafe_count > 0

    # Passo 4: Worst-case para valores numéricos
    wind_speed = _worst_case_max([s.wind_speed for s in available])
    wind_gust = _worst_case_max([s.wind_gust for s in available])
    precipitation = _worst_case_max([s.precipitation for s in available])
    visibility = _worst_case_min([s.visibility for s in available])

    # Passo 5: Variância
    wind_values = [s.wind_speed for s in available]
    variance = _variance_across(wind_values)

    # Se há alta divergência, aumentar o risco implícito
    if variance > 20 and not any_unsafe:
        # Divergência alta entre fontes mas nenhuma ultrapassou limite
        # Sinaliza como potencial risco
        pass  # O risk_score do decision engine já captura via uncertainty_factor

    # Passo 6: Confidence baseada em fontes seguras
    confidence_score = _confidence_from_sources(safe_count, len(available_results), variance)

    return ConsensusResult(
        wind_speed=round(wind_speed, 2),
        wind_gust=round(wind_gust, 2),
        precipitation=round(precipitation, 2),
        visibility=round(visibility, 2),
        variance=variance,
        confidence_score=confidence_score,
        source_count=len(available),
        total_sources=len(sources),
        safe_sources=safe_count,
        unsafe_sources=unsafe_count,
        any_unsafe=any_unsafe,
        sources_used=[s.source_name for s in available],
        per_source_results=per_source_results,
    )
