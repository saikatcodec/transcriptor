"use client";

import { Mic, MicOff, RotateCcw, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Waveform } from "@/components/ui/Waveform";
import { Badge } from "@/components/ui/Badge";
import { formatDuration } from "@/lib/utils";
import type { RecordingStatus } from "@/types";

interface RecordingControlsProps {
  status: RecordingStatus;
  duration: number;
  errorMessage: string | null;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export function RecordingControls({
  status,
  duration,
  errorMessage,
  onStart,
  onStop,
  onCancel,
  onReset,
}: RecordingControlsProps) {
  const isRecording = status === "recording";
  const isProcessing = status === "processing";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status Badge */}
      <div className="flex items-center gap-3">
        {isRecording && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
        )}
        <Badge
          variant={
            isRecording ? "accent" : isDone ? "success" : isError ? "accent" : "muted"
          }
        >
          {status === "idle" && "Ready"}
          {status === "recording" && `Recording — ${formatDuration(duration)}`}
          {status === "processing" && "Transcribing…"}
          {status === "done" && "Complete"}
          {status === "error" && "Error"}
        </Badge>
      </div>

      {/* Waveform */}
      <Waveform active={isRecording} bars={16} />

      {/* Error message */}
      {isError && errorMessage && (
        <div className="flex items-start gap-2 bg-accent/10 border border-accent/30 px-4 py-3 max-w-sm w-full">
          <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-accent leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {(status === "idle" || isError) && (
          <Button size="lg" onClick={onStart}>
            <Mic className="w-4 h-4" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <Button size="lg" variant="danger" onClick={onStop}>
            <MicOff className="w-4 h-4" />
            Stop Recording
          </Button>
        )}

        {isProcessing && (
          <>
            <Button size="lg" disabled loading>
              Processing
            </Button>
            <Button size="md" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </>
        )}

        {(isDone || isError) && (
          <Button size="md" variant="outline" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            New Session
          </Button>
        )}
      </div>
    </div>
  );
}
