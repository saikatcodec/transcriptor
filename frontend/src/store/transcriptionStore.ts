import { create } from "zustand";
import type { RecordingStatus } from "@/types";

interface TranscriptionStore {
  status: RecordingStatus;
  sessionId: string | null;
  partialText: string;
  finalText: string;
  wordCount: number;
  duration: number;
  errorMessage: string | null;

  // Actions
  setStatus: (status: RecordingStatus) => void;
  setSessionId: (id: string | null) => void;
  setPartialText: (text: string) => void;
  setFinalText: (text: string) => void;
  setWordCount: (count: number) => void;
  setDuration: (duration: number) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as RecordingStatus,
  sessionId: null,
  partialText: "",
  finalText: "",
  wordCount: 0,
  duration: 0,
  errorMessage: null,
};

export const useTranscriptionStore = create<TranscriptionStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setSessionId: (sessionId) => set({ sessionId }),
  setPartialText: (partialText) => set({ partialText }),
  setFinalText: (finalText) => set({ finalText }),
  setWordCount: (wordCount) => set({ wordCount }),
  setDuration: (duration) => set({ duration }),
  setError: (errorMessage) => set({ errorMessage }),
  reset: () => set(initialState),
}));
