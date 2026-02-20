"""
SessionService
==============
Thin data-access layer between the API layer and SQLAlchemy.
All methods are async and accept an AsyncSession injected by FastAPI's DI.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import TranscriptionSession
from app.utils.audio import build_preview, count_words
from app.core.logging import get_logger

logger = get_logger(__name__)


class SessionService:

    # Create 
    @staticmethod
    async def create_session(db: AsyncSession) -> TranscriptionSession:
        """
        Persist a new empty session row and return it.
        The session is persisted immediately so its ID can be sent to the
        client via WebSocket before transcription finishes.
        """
        session = TranscriptionSession()
        db.add(session)
        await db.flush()          # assigns the PK without committing
        await db.refresh(session)
        logger.info("Session created: id=%s", session.id)
        return session

    # Update 
    @staticmethod
    async def finalise_session(
        db: AsyncSession,
        session_id: str,
        transcript: str,
        duration_sec: float,
    ) -> TranscriptionSession | None:
        """
        Write the final transcript and computed metrics to an existing session.
        """
        result = await db.execute(
            select(TranscriptionSession).where(TranscriptionSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if session is None:
            logger.warning("finalise_session: session not found id=%s", session_id)
            return None

        session.transcript = transcript
        session.transcript_preview = build_preview(transcript)
        session.word_count = count_words(transcript)
        session.duration_sec = round(duration_sec, 2)

        await db.flush()
        await db.refresh(session)
        logger.info(
            "Session finalised: id=%s words=%d duration=%.2fs",
            session.id,
            session.word_count,
            session.duration_sec,
        )
        return session

    # Read
    @staticmethod
    async def list_sessions(db: AsyncSession) -> list[TranscriptionSession]:
        """Return all sessions ordered by most-recent first."""
        result = await db.execute(
            select(TranscriptionSession).order_by(
                TranscriptionSession.created_at.desc()
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_session(
        db: AsyncSession, session_id: str
    ) -> TranscriptionSession | None:
        """Return a single session by ID, or None if not found."""
        result = await db.execute(
            select(TranscriptionSession).where(TranscriptionSession.id == session_id)
        )
        return result.scalar_one_or_none()
