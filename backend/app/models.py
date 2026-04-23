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


class WeatherNormalized(Base):
    __tablename__ = "weather_normalized"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    wind_speed = Column(Float)
    wind_gust = Column(Float)
    precipitation = Column(Float)
    confidence_score = Column(Float)


class FlightStatus(Base):
    __tablename__ = "flight_status"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String)          # SAFE / WARNING / PROHIBITED
    risk_score = Column(Float)
    reasons = Column(JSON)
