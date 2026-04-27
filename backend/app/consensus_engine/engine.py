"""
Consensus Engine – Phase 4
===========================
Novidades:
  1. Receber dados de múltiplas fontes meteorológicas
  2. Aplicar pesos por confiabilidade da fonte
  3. Calcular variância entre fontes
  4. Calcular confidence_score
  5. Calcular risk_score INDIVIDUAL por fonte (para explainability)
  6. Retornar snapshot unificado + per_source_results

Pesos das Fontes (conforme spec):
  INMET       → 0.5  (estação A713/Ipero, ~17km de Boituva)
  Open-Meteo  → 0.3  (modelo global, lat/lon exato de Boituva)

Princípio: somente fontes com available=True entram no cálculo.
"""

from __future__ import annotations
import statistics
from dataclasses import dataclass, field
from typing import List, Optional

# ── Pesos por fonte ────────────────────────────────────────────────────────────
SOURCE_WEIGHTS: dict[str, float] = {
    "inmet": 0.5,
    "met_norway": 0.4, # Fallback primário se INMET estiver offline
    "open_meteo": 0.3,
}

SOURCE_LABELS: dict[str, str] = {
    "inmet": "INMET – Estação A713 (Ipero/SP, ~17km)",
    "met_norway": "Met Norway (Instituto Norueguês global)",
    "open_meteo": "Open-Meteo (modelo global – Boituva)",
}


@dataclass
class WeatherSourceData:
    """Dados brutos de uma fonte meteorológica."""
    source_name: str              # "open_meteo" | "inmet"
    wind_speed: float             # km/h
    wind_gust: float              # km/h
    precipitation: float          # mm
    visibility: float = 10.0      # km (padrão: visibilidade perfeita)
    available: bool = True        # False se a fonte falhou/não tem dados reais


@dataclass
class SourceResult:
    """Resultado individual do risk_score para uma fonte."""
    source_name: str
    label: str
    available: bool
    wind_speed: float
    wind_gust: float
    precipitation: float
    visibility: float
    risk_score: Optional[float]   # None se indisponível
    status: Optional[str]         # None se indisponível
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
    sources_used: List[str] = field(default_factory=list)
    per_source_results: List[SourceResult] = field(default_factory=list)


def _weighted_average(values: list[tuple[float, float]]) -> float:
    total_weight = sum(w for _, w in values)
    if total_weight == 0:
        return 0.0
    return sum(v * w for v, w in values) / total_weight


def _variance_across(values: list[float]) -> float:
    """Variância amostral normalizada 0-100."""
    if len(values) < 2:
        return 0.0
    var = statistics.variance(values)
    return round(min(var, 100.0), 2)


def _confidence_from_variance(variance: float, source_count: int) -> float:
    base = max(0.0, 1.0 - (variance / 200.0))
    source_bonus = min((source_count - 1) * 0.05, 0.15)
    return round(min(1.0, base + source_bonus), 2)


def _evaluate_source(source: WeatherSourceData) -> SourceResult:
    """
    Calcula risk_score individual para uma fonte.
    Importação lazy para evitar dependência circular.
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
            reasons=["Fonte indisponível – dados reais não obtidos"],
            weight=weight,
        )

    result = evaluate(
        wind_speed=source.wind_speed,
        wind_gust=source.wind_gust,
        precipitation=source.precipitation,
        visibility=source.visibility,
        variance=0.0,  # variance inter-fonte não aplicada por fonte individual
    )

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
        reasons=result["reasons"],
        weight=weight,
    )


def run_consensus(sources: List[WeatherSourceData]) -> ConsensusResult:
    """
    Executa o algoritmo de consenso sobre a lista de fontes.

    Passo 1: Calcular resultado individual de cada fonte (para explainability)
    Passo 2: Filtrar fontes disponíveis
    Passo 3: Calcular pesos normalizados
    Passo 4: Média ponderada de cada variável
    Passo 5: Calcular variância entre fontes
    Passo 6: Calcular confidence_score
    Passo 7: Retornar ConsensusResult com per_source_results
    """
    # Passo 1: Resultado por fonte (inclui indisponíveis para exibição)
    per_source_results = [_evaluate_source(s) for s in sources]

    # Passo 2: Filtrar disponíveis para cálculo do consensus
    available = [s for s in sources if s.available]

    if not available:
        return ConsensusResult(
            wind_speed=0.0, wind_gust=0.0, precipitation=0.0,
            visibility=10.0, variance=100.0, confidence_score=0.1,
            source_count=0, sources_used=[],
            per_source_results=per_source_results,
        )

    # Passo 3: Pesos normalizados
    raw_weights = [SOURCE_WEIGHTS.get(s.source_name, 0.1) for s in available]
    total = sum(raw_weights)
    norm_weights = [w / total for w in raw_weights]

    # Passo 4: Médias ponderadas
    wind_speed = _weighted_average([(s.wind_speed, w) for s, w in zip(available, norm_weights)])
    wind_gust = _weighted_average([(s.wind_gust, w) for s, w in zip(available, norm_weights)])
    precipitation = _weighted_average([(s.precipitation, w) for s, w in zip(available, norm_weights)])
    visibility = _weighted_average([(s.visibility, w) for s, w in zip(available, norm_weights)])

    # Passo 5: Variância (proxy de discordância entre fontes)
    wind_values = [s.wind_speed for s in available]
    variance = _variance_across(wind_values)

    # Passo 6: Confidence
    confidence_score = _confidence_from_variance(variance, len(available))

    return ConsensusResult(
        wind_speed=round(wind_speed, 2),
        wind_gust=round(wind_gust, 2),
        precipitation=round(precipitation, 2),
        visibility=round(visibility, 2),
        variance=variance,
        confidence_score=confidence_score,
        source_count=len(available),
        sources_used=[s.source_name for s in available],
        per_source_results=per_source_results,
    )
