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
    visibility = Column(Float, nullable=True)   # km, Phase 2
    # Phase 3
    variance = Column(Float, nullable=True)      # variância entre fontes
    source_count = Column(Integer, nullable=True)  # nº de fontes usadas


class FlightStatus(Base):
    __tablename__ = "flight_status"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String)            # SAFE / WARNING / PROHIBITED
    risk_score = Column(Float)
    reasons = Column(JSON)
    # Phase 2 fields
    risk_model_version = Column(String, nullable=True)
    risk_breakdown = Column(JSON, nullable=True)
    input_snapshot = Column(JSON, nullable=True)
    decision_trace = Column(JSON, nullable=True)
    # Phase 3
    confidence = Column(Float, nullable=True)    # confidence_score do consenso
    # Phase 4 – resultado por fonte para explainability
    sources_detail = Column(JSON, nullable=True)  # lista de SourceResult serializada


class AlertHook(Base):
    """Destinos de notificação cadastrados pelos usuários (Webhooks)."""
    __tablename__ = "alert_hooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)           # Ex: "Discord Grupo Boituva"
    url = Column(String)            # Endpoint POST
    is_active = Column(Integer, default=1)  # 1=ativo, 0=inativo


class AlertLog(Base):
    """Feed histórico de notificações enviadas pelo bot."""
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    old_status = Column(String)
    new_status = Column(String)
    message_sent = Column(String)
    # 1 se pelo menos um webhook respondeu ok, senão 0
    success = Column(Integer, default=1)
