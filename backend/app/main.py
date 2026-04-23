import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.api.routes import router
from app.agents.weather_ingestion import fetch_and_store_weather

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def background_weather_loop():
    while True:
        try:
            await fetch_and_store_weather()
            logger.info("Weather cycle complete")
        except Exception as e:
            logger.error(f"Weather fetch error: {e}")
        await asyncio.sleep(300)  # 5 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    task = asyncio.create_task(background_weather_loop())
    logger.info("Boituva Flight Ops started")
    yield
    task.cancel()


app = FastAPI(title="Boituva Flight Ops", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
