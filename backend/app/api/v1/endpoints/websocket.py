"""
WebSocket Transcription Endpoint
==================================
Route : WS /ws/transcribe

Protocol
--------
Client → Server (JSON):
  { "type": "audio_chunk", "audio": "<base64 Int16 PCM>" }
  { "type": "end_stream" }

Server → Client (JSON):
  { "type": "session_start",  "session_id": "..." }
  { "type": "partial",        "text": "..." }
  { "type": "final",          "text": "...", "word_count": N, "duration": F }
  { "type": "error",          "error": "..." }

Audio format expected from client
----------------------------------
  - 16-bit signed PCM, little-endian
  - 16 000 Hz sample rate  (AudioContext resamples on the frontend)
  - Mono channel
  - Encoded as base64 per chunk
"""

import asyncio
import json
import time
from typing import Any

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.core.logging import get_logger
from app.core.settings import get_settings
from app.db.database import AsyncSessionLocal
from app.schemas.session import (
    FinalTranscriptMessage,
    PartialTranscriptMessage,
    SessionStartMessage,
    WSErrorMessage,
)
from app.services.session import SessionService
from app.services.transcription import get_transcription_service
from app.utils.audio import base64_to_bytes, pcm_bytes_to_float32

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter()


async def _send_json(ws: WebSocket, payload: dict[str, Any]) -> None:
    """Send a JSON message only if the connection is still open."""
    if ws.client_state == WebSocketState.CONNECTED:
        await ws.send_json(payload)



@router.websocket("/ws/transcribe")
async def transcribe_ws(websocket: WebSocket) -> None:
    """
    Main WebSocket endpoint for real-time speech-to-text.

    Flow
    ----
    1. Accept connection.
    2. Create a DB session row → send session_id to client.
    3. Collect audio_chunk messages into a growing PCM buffer.
       Every PARTIAL_INTERVAL seconds, run Whisper on the current buffer
       and stream back a partial result.
    4. On end_stream, run final Whisper transcription on the full buffer,
       save to DB, and send the final result.
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted from %s", websocket.client)

    raw_audio_chunks: list[bytes] = []
    session_id: str | None = None
    start_time = time.monotonic()
    partial_last_sent = start_time
    PARTIAL_INTERVAL = settings.partial_transcription_interval_sec

    transcription_svc = get_transcription_service()

    async with AsyncSessionLocal() as db:
        try:
            db_session = await SessionService.create_session(db)
            await db.commit()
            session_id = db_session.id
        except Exception as exc:
            logger.exception("Failed to create session in DB: %s", exc)
            await _send_json(websocket, WSErrorMessage(error="Database error").model_dump())
            await websocket.close()
            return

    await _send_json(
        websocket,
        SessionStartMessage(session_id=session_id).model_dump(),
    )
    logger.info("Session started: id=%s", session_id)

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                logger.warning("Session %s timed out (60s idle)", session_id)
                break

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _send_json(websocket, WSErrorMessage(error="Invalid JSON").model_dump())
                continue

            msg_type = msg.get("type")

            if msg_type == "audio_chunk":
                b64 = msg.get("audio", "")
                if not b64:
                    continue

                try:
                    chunk_bytes = base64_to_bytes(b64)
                    raw_audio_chunks.append(chunk_bytes)
                except Exception as exc:
                    logger.warning("Failed to decode audio chunk: %s", exc)
                    continue

                now = time.monotonic()
                if now - partial_last_sent >= PARTIAL_INTERVAL:
                    partial_last_sent = now
                    all_bytes = b"".join(raw_audio_chunks)
                    audio_array = pcm_bytes_to_float32(all_bytes)

                    loop = asyncio.get_event_loop()
                    try:
                        partial_text = await loop.run_in_executor(
                            None,
                            transcription_svc.transcribe_full,
                            audio_array,
                        )
                        if partial_text:
                            await _send_json(
                                websocket,
                                PartialTranscriptMessage(text=partial_text).model_dump(),
                            )
                            logger.debug("Partial sent: %r", partial_text[:60])
                    except Exception as exc:
                        logger.warning("Partial transcription error: %s", exc)

            elif msg_type == "end_stream":
                logger.info("End-of-stream received for session %s", session_id)
                break

            else:
                logger.warning("Unknown message type: %r", msg_type)

    except WebSocketDisconnect:
        logger.info("Client disconnected for session %s", session_id)
    except Exception as exc:
        logger.exception("Unexpected error in WS loop (session=%s): %s", session_id, exc)
        try:
            await _send_json(websocket, WSErrorMessage(error=str(exc)).model_dump())
        except Exception:
            pass

    duration_sec = time.monotonic() - start_time
    final_text = ""

    if raw_audio_chunks:
        try:
            all_bytes = b"".join(raw_audio_chunks)
            audio_array = pcm_bytes_to_float32(all_bytes)

            loop = asyncio.get_event_loop()
            final_text = await loop.run_in_executor(
                None,
                transcription_svc.transcribe_full,
                audio_array,
            )
            logger.info(
                "Final transcription done — session=%s words=%d duration=%.2fs",
                session_id,
                len(final_text.split()) if final_text else 0,
                duration_sec,
            )
        except Exception as exc:
            logger.exception("Final transcription failed (session=%s): %s", session_id, exc)
            final_text = ""

    if session_id:
        async with AsyncSessionLocal() as db:
            try:
                await SessionService.finalise_session(
                    db=db,
                    session_id=session_id,
                    transcript=final_text,
                    duration_sec=duration_sec,
                )
                await db.commit()
            except Exception as exc:
                logger.exception("Failed to save final session (id=%s): %s", session_id, exc)

    word_count = len(final_text.split()) if final_text.strip() else 0
    try:
        await _send_json(
            websocket,
            FinalTranscriptMessage(
                text=final_text,
                word_count=word_count,
                duration=round(duration_sec, 2),
            ).model_dump(),
        )
    except Exception:
        pass  

    try:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()
    except Exception:
        pass

    logger.info("Session %s closed cleanly.", session_id)
