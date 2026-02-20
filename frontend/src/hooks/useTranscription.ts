"use client";

import { useRef, useCallback, useEffect } from "react";
import { useTranscriptionStore } from "@/store/transcriptionStore";
import { TranscriptionSocket } from "@/lib/websocket";
import { useAudioRecorder } from "./useAudioRecorder";
import type { WSIncomingMessage } from "@/types";

export function useTranscription() {
  const socketRef = useRef<TranscriptionSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const statusRef = useRef<string>("idle");

  const {
    status,
    sessionId,
    partialText,
    finalText,
    wordCount,
    duration,
    errorMessage,
    setStatus,
    setSessionId,
    setPartialText,
    setFinalText,
    setWordCount,
    setDuration,
    setError,
    reset,
  } = useTranscriptionStore();

  // Keep ref in sync with store
  statusRef.current = status;

  // ── Clear processing timeout helper ────────────────────────────────────────
  const clearProcessingTimeout = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  const handleWSMessage = useCallback(
    (msg: WSIncomingMessage) => {
      switch (msg.type) {
        case "session_start":
          setSessionId(msg.session_id ?? null);
          break;
        case "partial":
          setPartialText(msg.text ?? "");
          break;
        case "final":
          // Final arrived — clear the safety timeout and resolve cleanly
          clearProcessingTimeout();
          setFinalText(msg.text ?? "");
          setWordCount(msg.word_count ?? 0);
          setDuration(msg.duration ?? 0);
          setPartialText("");
          setStatus("done");
          socketRef.current?.disconnect();
          socketRef.current = null;
          break;
        case "error":
          clearProcessingTimeout();
          setError(msg.error ?? "Unknown error");
          setStatus("error");
          socketRef.current?.disconnect();
          socketRef.current = null;
          break;
      }
    },
    [
      clearProcessingTimeout,
      setSessionId,
      setPartialText,
      setFinalText,
      setWordCount,
      setDuration,
      setStatus,
      setError,
    ]
  );

  const { startRecording, stopRecording } = useAudioRecorder({
    onChunk: (base64) => socketRef.current?.sendAudioChunk(base64),
  });

  const startSession = useCallback(async () => {
    reset();

    try {
      // Step 1: Request mic access first. If denied, we never touch the socket.
      await startRecording();

      // Step 2: Mic granted — now connect WebSocket
      const socket = new TranscriptionSocket({
        onMessage: handleWSMessage,
        onError: () => {
          clearProcessingTimeout();
          setError("WebSocket connection failed. Is the backend running?");
          setStatus("error");
          stopRecording();
          socketRef.current = null;
        },
        onClose: () => {
          // Socket closed while still recording (e.g. server crash) → error
          if (statusRef.current === "recording") {
            clearProcessingTimeout();
            setError("Connection closed unexpectedly.");
            setStatus("error");
          }
          // If "processing", the safety timeout handles it
        },
      });

      await socket.connect();
      socketRef.current = socket;

      // Step 3: Everything ready — show "recording" state
      setStatus("recording");

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      setStatus("error");

      stopRecording();
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [
    reset,
    setStatus,
    setError,
    setDuration,
    handleWSMessage,
    startRecording,
    stopRecording,
    clearProcessingTimeout,
  ]);

  // Stop recording, keep socket open to wait for backend "final" message
  const stopSession = useCallback(() => {
    stopRecording();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Tell backend we're done — DO NOT disconnect yet, wait for "final"
    socketRef.current?.endStream();

    setStatus("processing");

    // Safety timeout: if backend never replies within 30s, stop the spinner
    clearProcessingTimeout();
    processingTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === "processing") {
        setError("Transcription timed out. The backend did not respond.");
        setStatus("error");
        socketRef.current?.disconnect();
        socketRef.current = null;
      }
    }, 30_000);
  }, [stopRecording, setStatus, setError, clearProcessingTimeout]);

  // Cancel while processing — user can bail out immediately without waiting
  const cancelSession = useCallback(() => {
    clearProcessingTimeout();
    socketRef.current?.disconnect();
    socketRef.current = null;
    stopRecording();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    reset();
  }, [clearProcessingTimeout, stopRecording, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
      clearProcessingTimeout();
    };
  }, [clearProcessingTimeout]);

  return {
    status,
    sessionId,
    partialText,
    finalText,
    wordCount,
    duration,
    errorMessage,
    startSession,
    stopSession,
    cancelSession,
    reset,
  };
}
