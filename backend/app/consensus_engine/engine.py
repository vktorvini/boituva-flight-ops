"""
Consensus Engine – Phase 3
===========================
Responsabilidades:
  1. Receber dados de múltiplas fontes meteorológicas
  2. Aplicar pesos por confiabilidade da fonte
  3. Calcular variância entre fontes
  4. Calcular confidence_score
  5. Retornar snapshot unificado

Pesos das Fontes (conforme spec):
  INMET       → 0.5
  Open-Meteo  → 0.3
  Fallback    → 0.2
"""

from __future__ import annotations
import statistics
from dataclasses import dataclass, field
from typing import List, Optional

# ── Pesos por fonte ────────────────────────────────────────────────────────────
SOURCE_WEIGHTS: dict[str, float] = {
    "inmet": 0.5,
    "open_meteo": 0.3,
    "fallback": 0.2,
}


@dataclass
class WeatherSourceData:
    """Dados brutos de uma fonte meteorológica."""
    source_name: str              # "open_meteo" | "inmet" | "fallback"
    wind_speed: float             # km/h
    wind_gust: float              # km/h
    precipitation: float          # mm
    visibility: float = 10.0      # km (padrão: visibilidade perfeita)
    available: bool = True        # False se a fonte falhou


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


def _weighted_average(values: list[tuple[float, float]]) -> float:
    """
    Calcula média ponderada.
    values: lista de (valor, peso)
    """
    total_weight = sum(w for _, w in values)
    if total_weight == 0:
        return 0.0
    return sum(v * w for v, w in values) / total_weight


def _variance_across(values: list[float]) -> float:
    """
    Retorna variância amostral ou 0 se 1 única fonte.
    Normalizada 0-100 para uso no uncertainty factor.
    """
    if len(values) < 2:
        return 0.0
    # Variância amostral
    var = statistics.variance(values)
    # Mapear para escala interpretável (ex: máx variância real ~ 50 km/h² → 100)
    return round(min(var, 100.0), 2)


def _confidence_from_variance(variance: float, source_count: int) -> float:
    """
    Confidence inversamente proporcional à variância.
    Alta variância → baixa confiança.
    Ponência extra por mais fontes.
    """
    # Base: decai com variância (0 variância = 1.0, variância 100 = ~0.5)
    base = max(0.0, 1.0 - (variance / 200.0))

    # Bônus por múltiplas fontes
    source_bonus = min((source_count - 1) * 0.05, 0.15)

    return round(min(1.0, base + source_bonus), 2)


def run_consensus(sources: List[WeatherSourceData]) -> ConsensusResult:
    """
    Executa o algoritmo de consenso sobre a lista de fontes disponíveis.

    Passo 1: Filtrar fontes disponíveis
    Passo 2: Calcular pesos normalizados
    Passo 3: Média ponderada de cada variável
    Passo 4: Calcular variância entre fontes
    Passo 5: Calcular confidence_score
    Passo 6: Retornar ConsensusResult
    """
    available = [s for s in sources if s.available]

    if not available:
        # Fallback de emergência — sem dados
        return ConsensusResult(
            wind_speed=0.0, wind_gust=0.0, precipitation=0.0,
            visibility=10.0, variance=100.0, confidence_score=0.1,
            source_count=0, sources_used=[],
        )

    # Pesos para as fontes disponíveis
    raw_weights = [SOURCE_WEIGHTS.get(s.source_name, 0.1) for s in available]
    total = sum(raw_weights)
    norm_weights = [w / total for w in raw_weights]  # normalizar para somar 1

    # Médias ponderadas
    wind_speed = _weighted_average([(s.wind_speed, w) for s, w in zip(available, norm_weights)])
    wind_gust = _weighted_average([(s.wind_gust, w) for s, w in zip(available, norm_weights)])
    precipitation = _weighted_average([(s.precipitation, w) for s, w in zip(available, norm_weights)])
    visibility = _weighted_average([(s.visibility, w) for s, w in zip(available, norm_weights)])

    # Variância (só em wind_speed como proxy de discordância entre fontes)
    wind_values = [s.wind_speed for s in available]
    variance = _variance_across(wind_values)

    # Confidence
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
    )
