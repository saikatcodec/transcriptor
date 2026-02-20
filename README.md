# AlphaNet — Real-Time Transcription

A full-stack, browser-based speech-to-text application. Audio captured in the browser is streamed over WebSockets to a FastAPI backend, transcribed in real time using a locally-hosted open-source AI model, and persisted to a Neon PostgreSQL database. No cloud AI services are used — all inference runs on CPU inside the container.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Next.js)                                          │
│                                                             │
│  getUserMedia → AudioContext (16kHz)                        │
│    → Int16 PCM → base64 → WebSocket ──────────────────┐     │
│                                                       │     │
│  Live partial transcript ←─────────────────────────┐  │     │
│  Final transcript + metrics ←──────────────────┐   │  │     │
└────────────────────────────────────────────────┼───┼──┼─────┘
                                                 │   │  │
                                       WS /ws/transcribe
                                                 │   │  │
┌────────────────────────────────────────────────┼───┼──┼─────┐
│  FastAPI Backend                               │   │  │     │
│                                                │   │  │     │
│  Accumulate PCM buffer ←───────────────────────┘   │  │     │
│  Every 2s → Whisper (tiny, CPU, int8) → partial ───┘  │     │
│  On end_stream → Whisper full buffer → final ─────────┘     │
│                                  ↓                          │
│                         Save to PostgreSQL                  │
│                                                             │
│  GET /sessions          → list all sessions                 │
│  GET /sessions/{id}     → full transcript + metadata        │
│  GET /health            → liveness probe                    │
└──────────────────────────────────┬──────────────────────────┘
                                   │ psycopg3 + SSL
                    ┌──────────────▼────────────────┐
                    │  Neon PostgreSQL (serverless) │
                    └───────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology                                    |
| ---------- | --------------------------------------------- |
| Frontend   | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend    | FastAPI, Python 3.13, Uvicorn                 |
| AI Model   | faster-whisper (tiny, CPU, int8 quantised)    |
| Database   | Neon PostgreSQL (serverless), psycopg3        |
| ORM        | SQLAlchemy 2.0 (async)                        |
| Migrations | Alembic                                       |
| Container  | Docker, Docker Compose                        |

---

## Project Structure

```
transcriptor/
├── README.md                        ← you are here
├── docker-compose.yml               ← full-stack launcher
│
├── frontend/                        ← Next.js app
│   ├── src/
│   │   ├── app/                     # pages & layouts (App Router)
│   │   ├── components/
│   │   │   ├── ui/                  # Badge, Button, StatCard, Waveform
│   │   │   └── transcription/       # RecordingControls, TranscriptDisplay, etc.
│   │   ├── hooks/                   # useAudioRecorder, useTranscription, useSessions
│   │   ├── lib/                     # api.ts, websocket.ts, utils.ts
│   │   ├── store/                   # Zustand transcription state
│   │   └── types/                   # shared TypeScript interfaces
│   ├── Dockerfile
│   └── next.config.mjs              # output: standalone (required for Docker)
│
└── backend/                         ← FastAPI app
    ├── app/
    │   ├── api/v1/endpoints/        # websocket.py, sessions.py, health.py
    │   ├── core/                    # settings.py, logging.py
    │   ├── db/                      # database.py (async SQLAlchemy engine)
    │   ├── models/                  # TranscriptionSession ORM model
    │   ├── schemas/                 # Pydantic request/response schemas
    │   ├── services/                # TranscriptionService (Whisper), SessionService
    │   └── utils/                   # audio.py (PCM → float32 conversion)
    ├── alembic/                     # migration files
    ├── tests/                       # pytest suite (real PostgreSQL)
    ├── Dockerfile                   # python:3.13-slim
    ├── requirements.txt
    └── schema.sql                   # plain SQL DDL alternative
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- A [Neon](https://neon.tech) account with a project created (free tier works)
- At least **4 GB of RAM** allocated to Docker (needed to build `ctranslate2` / `onnxruntime`)

---

## Getting Started

### 1. Clone and enter the project

```bash
git clone https://github.com/saikatcodec/transcriptor.git
cd transcriptor
```

### 2. Set up the Neon database

1. Log in to [console.neon.tech](https://console.neon.tech)
2. Create a new project (or use an existing one)
3. Go to **Connection Details** and copy the **Connection string**:
   ```
   postgresql://user:password@ep-xxxx-xxxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### 3. Configure the backend environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and paste your Neon connection string:

```env
DATABASE_URL=postgresql://user:password@ep-xxxx-xxxxxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### 4. Run database migrations

You can run migrations before starting Docker, or let the app auto-create tables on startup. To run them manually:

```bash
cd backend
conda create -p venv/ python=3.13 -y
conda activate ./venv/
pip install -r requirements.txt
alembic upgrade head
cd ..
```

### 5. Build and start the full stack

```bash
docker-compose up --build
```

> **First run note:** The Whisper `tiny` model (~39 MB) is downloaded automatically when the backend first starts. This adds ~30–60 seconds to the first startup. The model is cached in a Docker volume (`whisper_models`) so subsequent starts are instant.

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:3000        |
| Backend  | http://localhost:8000        |
| API Docs | http://localhost:8000/docs   |
| Health   | http://localhost:8000/health |

---

## Running Without Docker

### Backend

```bash
cd backend

conda create -p venv/ python=3.13 -y
conda activate ./venv/

pip install --upgrade pip
pip install numpy ctranslate2 onnxruntime faster-whisper
pip install -r requirements.txt

cp .env.example .env            # then set DATABASE_URL

alembic upgrade head            # create tables in Neon

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # WS and API URLs default to localhost:8000
npm run dev
```

Open http://localhost:3000.

---

## Usage

1. Open http://localhost:3000 in a browser that supports `getUserMedia` (Chrome, Firefox, Edge)
2. Click **Start Recording** and allow microphone access when prompted
3. Speak — partial transcription appears in real time as you talk
4. Click **Stop Recording** — the backend finalises transcription and saves the session
5. Word count, duration, and WPM metrics are displayed after completion
6. All past sessions are accessible via the **Past Sessions** panel or at `/sessions`

---

## API Reference

### WebSocket

**Endpoint:** `WS /ws/transcribe`

| Direction       | Message                                                              |
| --------------- | -------------------------------------------------------------------- |
| Client → Server | `{ "type": "audio_chunk", "audio": "<base64 Int16 PCM 16kHz>" }`     |
| Client → Server | `{ "type": "end_stream" }`                                           |
| Server → Client | `{ "type": "session_start", "session_id": "uuid" }`                  |
| Server → Client | `{ "type": "partial", "text": "..." }`                               |
| Server → Client | `{ "type": "final", "text": "...", "word_count": N, "duration": F }` |
| Server → Client | `{ "type": "error", "error": "description" }`                        |

### REST

```bash
# List all sessions (newest first)
GET /sessions

# Get a single session with full transcript
GET /sessions/{id}

# Health check + model status
GET /health
```

**Example — list sessions:**

```bash
curl http://localhost:8000/sessions/
```

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-01-15T10:30:00Z",
    "word_count": 47,
    "duration": 18.3,
    "transcript_preview": "Hello this is a test of the transcription system…"
  }
]
```

---

## Running Tests

Tests run against the real Neon PostgreSQL database. Each test is isolated inside a transaction that is rolled back on teardown — no data persists between tests.

```bash
cd backend

conda activate ./venv/

# DATABASE_URL is read automatically from .env
pytest -v
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                             | Required | Default        | Description                                 |
| ------------------------------------ | -------- | -------------- | ------------------------------------------- |
| `DATABASE_URL`                       | ✅ Yes   | —              | Neon PostgreSQL connection string           |
| `APP_ENV`                            | No       | development    | `development` or `production`               |
| `DEBUG`                              | No       | true           | Enables SQLAlchemy query logging            |
| `CORS_ORIGINS`                       | No       | localhost:3000 | Comma-separated allowed origins             |
| `WHISPER_MODEL_SIZE`                 | No       | tiny           | `tiny`, `tiny.en`, `base`, `base.en`        |
| `WHISPER_DEVICE`                     | No       | cpu            | `cpu` (GPU not supported in this setup)     |
| `WHISPER_COMPUTE_TYPE`               | No       | int8           | `int8` is fastest on CPU                    |
| `WHISPER_MODEL_DIR`                  | No       | ./models       | Local directory to cache downloaded model   |
| `PARTIAL_TRANSCRIPTION_INTERVAL_SEC` | No       | 2.0            | How often (seconds) to emit partial results |

### Frontend (`frontend/.env.local`)

| Variable              | Default                 | Description        |
| --------------------- | ----------------------- | ------------------ |
| `NEXT_PUBLIC_WS_URL`  | `ws://localhost:8000`   | WebSocket endpoint |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | REST API base URL  |

---

## Database Schema

```sql
CREATE TABLE transcription_sessions (
    id                 VARCHAR(36)              PRIMARY KEY,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transcript         TEXT                     NOT NULL DEFAULT '',
    transcript_preview VARCHAR(200)             NOT NULL DEFAULT '',
    word_count         INTEGER                  NOT NULL DEFAULT 0,
    duration_sec       FLOAT                    NOT NULL DEFAULT 0.0
);

CREATE INDEX ix_transcription_sessions_created_at
    ON transcription_sessions (created_at DESC);
```

---

## Known Limitations

- **Single worker:** Only one Uvicorn worker runs. Concurrent transcription sessions share the same CPU — quality degrades with multiple simultaneous users.
- **English only:** `language="en"` is hardcoded in the Whisper call for speed. Multi-language support requires removing this and accepting a ~1–2s language detection overhead.
- **No authentication:** All sessions are publicly readable. Not suitable for production multi-user deployment without adding auth.
- **No WebSocket reconnection:** If the connection drops mid-session, the partial audio buffer is lost and the user must start a new session.
- **Docker memory:** Building the image requires at least 4 GB of RAM in Docker due to the size of `ctranslate2` and `onnxruntime`. On Docker Desktop, increase this in Settings → Resources.
