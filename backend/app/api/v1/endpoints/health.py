from fastapi import APIRouter
from app.services.transcription import get_transcription_service

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """Quick liveness probe for load balancers / Docker HEALTHCHECK."""
    svc = get_transcription_service()
    return {
        "status": "ok",
        "model_loaded": svc._model is not None,
    }
