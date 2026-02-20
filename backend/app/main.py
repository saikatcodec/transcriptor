"""
Application Factory
===================
Creates and configures the FastAPI application instance.
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.logging import get_logger, setup_logging
from app.core.settings import get_settings
from app.db.database import create_all_tables
from app.services.transcription import get_transcription_service

settings = get_settings()
setup_logging()
logger = get_logger(__name__)


# Lifespan 
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Startup / shutdown lifecycle handler.

    Startup
    -------
    1. Create database tables (idempotent — safe for fresh installs).
    2. Load the Whisper model into memory so the first request is fast.

    Shutdown
    --------
    Nothing special needed — SQLAlchemy and Uvicorn handle cleanup.
    """
    logger.info("Starting Transcription API (env=%s)", settings.app_env)

    # 1. Ensure tables exist (also handles SQLite first-run)
    await create_all_tables()
    logger.info("Database tables verified.")

    # 2. Load Whisper model (this may take ~5–30 s on first run while downloading)
    svc = get_transcription_service()
    svc.load_model()

    logger.info("Application ready.")
    yield

    logger.info("Application shutting down.")


# App Factory 
def create_app() -> FastAPI:
    app = FastAPI(
        title="AlphaNet Real-Time Transcription API",
        description=(
            "WebSocket-based real-time speech-to-text using faster-whisper (CPU-only). "
            "Audio is streamed from the browser, transcribed incrementally, and persisted."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS 
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_router)

    return app


# Application instance
app = create_app()
