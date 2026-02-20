from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# WebSocket Messages (Client → Server)
class AudioChunkMessage(BaseModel):
    type: Literal["audio_chunk"]
    audio: str = Field(..., description="Base64-encoded 16-bit PCM audio chunk")


class EndStreamMessage(BaseModel):
    type: Literal["end_stream"]


# WebSocket Messages (Server → Client)
class SessionStartMessage(BaseModel):
    type: Literal["session_start"] = "session_start"
    session_id: str


class PartialTranscriptMessage(BaseModel):
    type: Literal["partial"] = "partial"
    text: str


class FinalTranscriptMessage(BaseModel):
    type: Literal["final"] = "final"
    text: str
    word_count: int
    duration: float


class WSErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    error: str


# REST API Schemas
class SessionListItem(BaseModel):
    """Lightweight representation used in GET /sessions list."""
    id: str
    created_at: datetime
    word_count: int
    duration: float
    transcript_preview: str

    model_config = {"from_attributes": True}


class SessionDetail(BaseModel):
    """Full session details returned by GET /sessions/{id}."""
    id: str
    created_at: datetime
    transcript: str
    transcript_preview: str
    word_count: int
    duration: float

    model_config = {"from_attributes": True}
