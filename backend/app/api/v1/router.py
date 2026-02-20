from fastapi import APIRouter

from app.api.v1.endpoints import health, sessions, websocket

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(sessions.router)
api_router.include_router(websocket.router)
