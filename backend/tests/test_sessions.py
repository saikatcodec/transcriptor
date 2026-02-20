"""
Test Suite
==========
All tests run against a real PostgreSQL database (Neon or local).
Each test is wrapped in a transaction that rolls back on teardown.

Tests:
  1. GET /sessions     → empty list when no sessions exist
  2. GET /sessions/:id → 404 for unknown session
  3. Create + retrieve → correct transcript and metrics persisted
  4. PCM → float32     → silence maps to all-zero float32
  5. PCM → float32     → Int16 max maps to ~1.0 float32
  6. Utility helpers   → count_words, build_preview
"""

import numpy as np
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.session import SessionService
from app.utils.audio import count_words, pcm_bytes_to_float32, build_preview


# 1. Empty sessions list
@pytest.mark.asyncio
async def test_list_sessions_empty(client: AsyncClient):
    """GET /sessions/ should return an empty list when the DB has no rows."""
    response = await client.get("/sessions/")
    assert response.status_code == 200
    assert response.json() == []


# 2. Session not found
@pytest.mark.asyncio
async def test_get_session_not_found(client: AsyncClient):
    """GET /sessions/{id} must return 404 for a non-existent session."""
    response = await client.get("/sessions/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# 3. Create, finalise and retrieve a session 
@pytest.mark.asyncio
async def test_create_and_retrieve_session(client: AsyncClient, db_session: AsyncSession):
    """
    Full round-trip: create session → finalise with transcript →
    fetch via REST → verify all fields.
    """
    session = await SessionService.create_session(db_session)
    await db_session.flush()

    await SessionService.finalise_session(
        db=db_session,
        session_id=session.id,
        transcript="Hello world this is a test",
        duration_sec=4.2,
    )
    await db_session.flush()

    response = await client.get(f"/sessions/{session.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == session.id
    assert data["transcript"] == "Hello world this is a test"
    assert data["word_count"] == 5
    assert data["duration"] == pytest.approx(4.2, abs=0.01)
    assert data["transcript_preview"] == "Hello world this is a test"


# 4. Sessions list returns the new session 
@pytest.mark.asyncio
async def test_list_sessions_returns_created(client: AsyncClient, db_session: AsyncSession):
    """GET /sessions/ should include the session we just created."""
    session = await SessionService.create_session(db_session)
    await SessionService.finalise_session(
        db=db_session,
        session_id=session.id,
        transcript="Testing the list endpoint",
        duration_sec=2.0,
    )
    await db_session.flush()

    response = await client.get("/sessions/")
    assert response.status_code == 200
    ids = [s["id"] for s in response.json()]
    assert session.id in ids


# 5. Audio utility — silence 
def test_pcm_bytes_to_float32_silence():
    """All-zero PCM bytes should produce an all-zero float32 array."""
    silence = bytes(4096 * 2)  # 4096 int16 samples
    result = pcm_bytes_to_float32(silence)
    assert result.dtype == np.float32
    assert len(result) == 4096
    assert np.all(result == 0.0)


# 6. Audio utility — max positive value 
def test_pcm_bytes_to_float32_max_positive():
    """Int16 max (32767) should map to ~1.0 float32."""
    sample = np.array([32767], dtype=np.int16)
    result = pcm_bytes_to_float32(sample.tobytes())
    assert result[0] == pytest.approx(1.0, abs=0.001)


# 7. Utility helpers
def test_count_words():
    assert count_words("hello world") == 2
    assert count_words("  ") == 0
    assert count_words("one") == 1


def test_build_preview_short():
    text = "Short text"
    assert build_preview(text, max_chars=200) == text


def test_build_preview_truncates():
    text = "word " * 100  # 500 chars
    preview = build_preview(text, max_chars=50)
    assert len(preview) <= 55
    assert preview.endswith("…")
