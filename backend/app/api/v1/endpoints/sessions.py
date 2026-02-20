"""
Sessions REST API
=================
GET /sessions        → list all sessions (summary)
GET /sessions/{id}   → retrieve full session detail
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.session import SessionDetail, SessionListItem
from app.services.session import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/", response_model=list[SessionListItem])
async def list_sessions(db: AsyncSession = Depends(get_db)) -> list[SessionListItem]:
    """
    Retrieve a list of all transcription sessions, ordered newest-first.

    Returns lightweight objects (no full transcript) for fast list rendering.
    """
    sessions = await SessionService.list_sessions(db)
    return [
        SessionListItem(
            id=s.id,
            created_at=s.created_at,
            word_count=s.word_count,
            duration=s.duration_sec,
            transcript_preview=s.transcript_preview,
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SessionDetail:
    """
    Retrieve the full transcript and metadata for a specific session.

    Returns 404 if the session does not exist.
    """
    session = await SessionService.get_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    return SessionDetail(
        id=session.id,
        created_at=session.created_at,
        transcript=session.transcript,
        transcript_preview=session.transcript_preview,
        word_count=session.word_count,
        duration=session.duration_sec,
    )
