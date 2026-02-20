// WebSocket Message Types 
export type WSMessageType =
  | "partial"
  | "final"
  | "session_start"
  | "session_end"
  | "error";

export interface WSIncomingMessage {
  type: WSMessageType;
  text?: string;
  session_id?: string;
  word_count?: number;
  duration?: number;
  error?: string;
}

export interface WSOutgoingMessage {
  type: "audio_chunk" | "end_stream";
  audio?: string; // base64 encoded
}

// Session Types 
export interface Session {
  id: string;
  created_at: string;
  duration: number;
  word_count: number;
  transcript: string;
}

export interface SessionListItem {
  id: string;
  created_at: string;
  word_count: number;
  duration: number;
  transcript_preview: string;
}

// Transcription State 
export type RecordingStatus = "idle" | "recording" | "processing" | "done" | "error";

export interface TranscriptionState {
  status: RecordingStatus;
  sessionId: string | null;
  partialText: string;
  finalText: string;
  wordCount: number;
  duration: number;
  errorMessage: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
