# AlphaNet Transcription — Backend

> FastAPI + faster-whisper (CPU) + **Neon PostgreSQL** real-time speech-to-text backend.
> Python **3.13** · psycopg3 · Docker-ready.

---

## Folder Structure

```
transcription-backend/
├── app/
│   ├── main.py                        # App factory, lifespan, middleware
│   ├── api/v1/
│   │   ├── router.py                  # Combines all endpoint routers
│   │   └── endpoints/
│   │       ├── websocket.py           # WS /ws/transcribe  ← core
│   │       ├── sessions.py            # GET /sessions, GET /sessions/{id}
│   │       └── health.py              # GET /health
│   ├── core/
│   │   ├── settings.py                # Pydantic-settings (auto-normalises Neon URL)
│   │   └── logging.py                 # Structured logging
│   ├── db/database.py                 # Async SQLAlchemy engine (psycopg3)
│   ├── models/session.py              # TranscriptionSession ORM model
│   ├── schemas/session.py             # Pydantic schemas (WS + REST)
│   ├── services/
│   │   ├── transcription.py           # Whisper singleton + transcribe()
│   │   └── session.py                 # DB CRUD (create, finalise, list, get)
│   └── utils/audio.py                 # PCM → float32, base64 decode, helpers
├── alembic/                           # Migration files (psycopg3 async)
├── tests/
│   ├── conftest.py                    # Real PostgreSQL fixtures (transaction rollback)
│   └── test_sessions.py              # REST + utility tests (7 tests)
├── schema.sql                         # Plain SQL DDL alternative
├── alembic.ini
├── requirements.txt                   # psycopg[binary,pool], Python 3.13 compatible
├── Dockerfile                         # python:3.13-slim, no libpq system dep
└── .env.example
```

---

## Quick Start

### 1. Get your Neon connection string

1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project → **Connection Details**
3. Copy the **Connection string** — it looks like:
   ```
   postgresql://alex:AbC123dEf@ep-cool-darkness-123456.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### 2. Configure environment

```bash
cd transcription-backend
cp .env.example .env
# Paste your Neon connection string as DATABASE_URL in .env
```

### 3. Install and run

```bash
python3.13 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

# Run migrations (creates the table in Neon)
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On first startup the Whisper `tiny` model (~39 MB) is downloaded automatically.

---

## Running Tests

Tests run against your real Neon database. Each test is wrapped in a transaction
that is **rolled back** after the test, so no data persists between tests.

```bash
# DATABASE_URL must be set (reads from .env automatically)
pytest -v
```

Expected output:
```
tests/test_sessions.py::test_list_sessions_empty          PASSED
tests/test_sessions.py::test_get_session_not_found        PASSED
tests/test_sessions.py::test_create_and_retrieve_session  PASSED
tests/test_sessions.py::test_list_sessions_returns_created PASSED
tests/test_sessions.py::test_pcm_bytes_to_float32_silence PASSED
tests/test_sessions.py::test_pcm_bytes_to_float32_max_positive PASSED
tests/test_sessions.py::test_count_words                  PASSED
tests/test_sessions.py::test_build_preview_short          PASSED
tests/test_sessions.py::test_build_preview_truncates      PASSED
```

---

## Docker

```bash
# From project root (next to docker-compose.yml)
# Make sure transcription-backend/.env contains DATABASE_URL

docker-compose up --build
```

The Docker image uses **python:3.13-slim**. `psycopg[binary]` bundles libpq,
so no system PostgreSQL client library is required in the image.

---

## API Reference

### WebSocket — `WS /ws/transcribe`

**Client → Server:**
```json
{ "type": "audio_chunk", "audio": "<base64 Int16 PCM at 16kHz>" }
{ "type": "end_stream" }
```

**Server → Client:**
```json
{ "type": "session_start", "session_id": "uuid" }
{ "type": "partial",       "text": "Hello world..." }
{ "type": "final",         "text": "Complete text.", "word_count": 7, "duration": 12.4 }
{ "type": "error",         "error": "description" }
```

### REST Endpoints

```bash
# List all sessions (newest first)
curl http://localhost:8000/sessions/

# Get a specific session with full transcript
curl http://localhost:8000/sessions/<uuid>

# Health check (also shows if Whisper model is loaded)
curl http://localhost:8000/health
```

---

## Database Schema

```sql
CREATE TABLE transcription_sessions (
    id                 VARCHAR(36)              PRIMARY KEY,   -- UUID
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL,      -- UTC
    transcript         TEXT                     NOT NULL,
    transcript_preview VARCHAR(200)             NOT NULL,      -- denormalised
    word_count         INTEGER                  NOT NULL,
    duration_sec       FLOAT                    NOT NULL
);

CREATE INDEX ix_transcription_sessions_created_at
    ON transcription_sessions (created_at DESC);
```

---

## Database Driver: psycopg3

The project uses **psycopg3** (`psycopg[binary,pool]`) instead of the older
psycopg2/asyncpg. Reasons:

- **Native async** — built-in asyncio support, no need for asyncpg wrapper
- **Neon SSL** — handles `sslmode=require` from the Neon URL without extra config
- **Python 3.13 compatible** — psycopg2 requires system libpq and has build issues on 3.13
- **Binary package** — bundles its own libpq, no system dependency needed in Docker

The `DATABASE_URL` is accepted in any standard Postgres format and auto-normalised
to `postgresql+psycopg://` in `app/core/settings.py`.

---

## Limitations & Future Improvements

- Single Uvicorn worker — Whisper is CPU-bound; concurrent sessions compete for CPU
- English-only transcription (`language="en"` hardcoded)
- No WebSocket reconnection on drop
- Model warmup happens on first real transcription request (not on startup)
