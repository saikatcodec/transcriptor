"use client";

import { useRef, useCallback } from "react";
import { arrayBufferToBase64 } from "@/lib/utils";

interface UseAudioRecorderOptions {
  onChunk: (base64: string) => void;
}

export function useAudioRecorder({ onChunk }: UseAudioRecorderOptions) {
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  const startRecording = useCallback(async () => {
    // Step 1: Request mic access — NO sampleRate constraint here.
    // Browsers silently ignore or reject unsupported sampleRate values (e.g. 16000).
    // We let the browser use its native rate (usually 44100 or 48000) and
    // resample via AudioContext below.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      // Translate browser DOMException into a readable message
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          throw new Error(
            "Microphone permission denied. Please allow microphone access in your browser and try again."
          );
        }
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          throw new Error(
            "No microphone found. Please connect a microphone and try again."
          );
        }
        if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          throw new Error(
            "Microphone is already in use by another application. Please close it and try again."
          );
        }
      }
      throw err;
    }

    streamRef.current = stream;

    // Step 2: Create AudioContext at 16 kHz for resampling.
    // AudioContext sampleRate IS supported by all browsers (unlike getUserMedia constraint).
    const context = new AudioContext({ sampleRate: 16000 });
    contextRef.current = context;

    // AudioContext can start in "suspended" state on some browsers — resume it.
    if (context.state === "suspended") {
      await context.resume();
    }

    const source = context.createMediaStreamSource(stream);

    // Step 3: ScriptProcessorNode captures resampled 16 kHz PCM frames.
    const processor = context.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32Array → Int16 PCM (little-endian, signed)
      const pcm = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const clamped = Math.max(-1, Math.min(1, inputData[i]));
        pcm[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
      }

      const base64 = arrayBufferToBase64(pcm.buffer);
      onChunk(base64);
    };

    // ScriptProcessorNode must be connected to destination to fire in Chrome
    source.connect(processor);
    processor.connect(context.destination);
  }, [onChunk]);

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    contextRef.current?.close().catch(() => {});
    contextRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  return { startRecording, stopRecording };
}
