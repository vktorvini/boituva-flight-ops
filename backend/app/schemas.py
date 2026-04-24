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


class FlightStatusOut(BaseModel):
    timestamp: datetime
    status: str
    risk_score: float
    reasons: List[str]
    wind_speed: float
    wind_gust: float
    precipitation: float
    # Phase 2
    risk_model_version: Optional[str] = None
    breakdown: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    # Phase 3
    source_count: Optional[int] = None

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
