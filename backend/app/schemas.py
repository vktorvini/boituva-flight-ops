from datetime import datetime
from typing import List, Optional
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
