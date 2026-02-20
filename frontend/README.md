# Transcription — Frontend

> Real-time browser-based speech-to-text transcription UI built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

---

## Folder Structure

```
src/
├── app/                        # Next.js App Router
│   ├── globals.css             # Global styles, fonts, CSS variables
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                # Home — main transcription interface
│   ├── not-found.tsx           # 404 page
│   └── sessions/
│       └── page.tsx            # Full session history page
│
├── components/
│   ├── ui/                     # Generic, reusable UI primitives
│   │   ├── Badge.tsx           # Status/label badge
│   │   ├── Button.tsx          # Polymorphic button with variants
│   │   ├── StatCard.tsx        # Metric display card
│   │   └── Waveform.tsx        # Animated audio waveform bars
│   │
│   └── transcription/          # Feature-specific components
│       ├── RecordingControls.tsx   # Mic controls, status badge, waveform
│       ├── TranscriptDisplay.tsx   # Live + final transcript output
│       ├── SessionStats.tsx        # Post-session metrics (words, WPM, time)
│       ├── SessionHistory.tsx      # Collapsible history list with modal detail
│       └── TranscriptionPanel.tsx  # Root panel composing all the above
│
├── hooks/                      # Custom React hooks
│   ├── useAudioRecorder.ts     # MediaStream capture → PCM chunks
│   ├── useTranscription.ts     # Full session lifecycle (WS + recording)
│   └── useSessions.ts          # REST API data-fetching hooks
│
├── lib/                        # Pure utilities / clients
│   ├── api.ts                  # Typed REST API client
│   ├── websocket.ts            # WebSocket wrapper class
│   └── utils.ts                # cn(), formatDuration(), formatDate(), etc.
│
├── store/
│   └── transcriptionStore.ts   # Zustand state slice for transcription
│
└── types/
    └── index.ts                # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Backend running at `http://localhost:8000` (see backend README)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.local.example .env.local

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable              | Default                 | Description                        |
| --------------------- | ----------------------- | ---------------------------------- |
| `NEXT_PUBLIC_WS_URL`  | `ws://localhost:8000`   | WebSocket endpoint for the backend |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | REST API base URL                  |

---

## Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_WS_URL=ws://backend:8000 \
  --build-arg NEXT_PUBLIC_API_URL=http://backend:8000 \
  -t transcribe-frontend .

docker run -p 3000:3000 transcribe-frontend
```

---

## Architecture & Design Decisions

### WebSocket Flow

1. User clicks **Start Recording** → `useTranscription` hook opens a WebSocket to `/ws/transcribe`.
2. `useAudioRecorder` captures microphone audio via the Web Audio API, converts `Float32` samples to **16-bit PCM**, base64-encodes each chunk, and sends it over the WebSocket every ~4096 samples.
3. The backend responds with `{ type: "partial", text: "…" }` messages that update the live transcript in real time.
4. On **Stop Recording**, an `end_stream` message is sent. The backend flushes its buffer and returns a `final` message with the complete transcript and metrics.

### State Management

- **Zustand** is used for transcription state (`status`, `partialText`, `finalText`, etc.) so it can be accessed from both hooks and deeply-nested components without prop drilling.
- REST data (sessions list) is managed locally with `useState` inside custom hooks — lightweight enough to not warrant global state.

### Audio Pipeline

```
Microphone (MediaStream)
  → AudioContext (16 kHz)
  → ScriptProcessorNode (4096 samples)
  → Float32 → Int16 PCM conversion
  → base64 encode
  → WebSocket.send()
```

`ScriptProcessorNode` is used for broad browser compatibility. Migrating to `AudioWorklet` is noted as a future improvement.

---

## Limitations & Future Improvements

- **ScriptProcessorNode** is deprecated; migrate to `AudioWorkletProcessor` for better performance.
- **No authentication** — all sessions are globally visible.
- **No reconnection logic** — if the WebSocket drops mid-session, the user must restart manually.
- Add `AudioWorklet` for more accurate, thread-isolated audio processing.
- Add copy-to-clipboard and export (`.txt` / `.srt`) for final transcripts.
- Add waveform visualization using `AnalyserNode` FFT data.
