from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class WeatherCurrent(BaseModel):
    timestamp: datetime
    wind_speed: float
    wind_gust: float
    wind_direction: float
    temperature: float
    humidity: float
    pressure: float
    precipitation: float
    visibility: Optional[float] = None

    class Config:
        from_attributes = True


class SourceDetail(BaseModel):
    """Resultado individual por fonte para explainability."""
    source_name: str
    label: str
    available: bool
    wind_speed: float
    wind_gust: float
    precipitation: float
    visibility: float
    risk_score: Optional[float] = None
    status: Optional[str] = None
    reasons: List[str] = []
    weight: float = 0.0


class FlightStatusOut(BaseModel):
    timestamp: datetime
    status: str
    risk_score: float
    reasons: List[str]
    wind_speed: float
    wind_gust: float
    wind_direction: Optional[float] = None # Added for v2
    precipitation: float
    # Phase 2
    risk_model_version: Optional[str] = None
    breakdown: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    # Phase 3
    source_count: Optional[int] = None
    # Phase 4 – detalhes por fonte
    sources_detail: Optional[List[SourceDetail]] = None

    class Config:
        from_attributes = True


class FlightWindowEntry(BaseModel):
    hour: str
    status: str
    wind_speed: float
    wind_gust: float
    precipitation: float


class FlightWindowOut(BaseModel):
    window: List[FlightWindowEntry]


class AlertHookCreate(BaseModel):
    name: str
    url: str
    is_active: int = 1


class AlertHookOut(BaseModel):
    id: int
    name: str
    url: str
    is_active: int

    class Config:
        from_attributes = True


class AlertLogOut(BaseModel):
    id: int
    timestamp: datetime
    old_status: str
    new_status: str
    message_sent: str
    success: int

    class Config:
        from_attributes = True
