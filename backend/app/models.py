from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, JSON
from app.database import Base


class WeatherRaw(Base):
    __tablename__ = "weather_raw"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    wind_speed = Column(Float)
    wind_gust = Column(Float)
    wind_direction = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    pressure = Column(Float)
    precipitation = Column(Float)
    visibility = Column(Float, nullable=True)  # km, Phase 2


class WeatherNormalized(Base):
    __tablename__ = "weather_normalized"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    wind_speed = Column(Float)
    wind_gust = Column(Float)
    precipitation = Column(Float)
    confidence_score = Column(Float)
    visibility = Column(Float, nullable=True)  # km, Phase 2


class FlightStatus(Base):
    __tablename__ = "flight_status"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String)            # SAFE / WARNING / PROHIBITED
    risk_score = Column(Float)
    reasons = Column(JSON)
    # Phase 2 fields
    risk_model_version = Column(String, nullable=True)  # e.g. "v1.0"
    risk_breakdown = Column(JSON, nullable=True)         # {W, G, P, V, weighted}
    input_snapshot = Column(JSON, nullable=True)         # raw inputs used
    decision_trace = Column(JSON, nullable=True)         # hard rules fired
