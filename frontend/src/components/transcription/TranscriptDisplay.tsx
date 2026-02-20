"use client";

import { cn } from "@/lib/utils";
import type { RecordingStatus } from "@/types";

interface TranscriptDisplayProps {
  status: RecordingStatus;
  partialText: string;
  finalText: string;
  errorMessage: string | null;
}

export function TranscriptDisplay({
  status,
  partialText,
  finalText,
  errorMessage,
}: TranscriptDisplayProps) {
  const isEmpty =
    status === "idle" || (status === "recording" && !partialText);

  return (
    <div className="relative min-h-[200px] border border-border bg-surface rounded-none p-6">
      {/* Label */}
      <span className="absolute top-3 right-4 text-xs font-mono text-muted uppercase tracking-widest">
        {status === "recording" && "Live"}
        {status === "processing" && "Processing"}
        {status === "done" && "Final"}
        {status === "error" && "Error"}
        {status === "idle" && "Transcript"}
      </span>

      {/* Content */}
      {status === "error" && errorMessage ? (
        <p className="font-mono text-sm text-accent mt-2">{errorMessage}</p>
      ) : isEmpty ? (
        <p className="font-body text-muted italic text-sm mt-2">
          Your transcription will appear here in real time…
        </p>
      ) : (
        <div className="mt-2">
          {/* Final text */}
          {finalText && (
            <p className="font-body text-paper text-base leading-relaxed animate-fade-in">
              {finalText}
            </p>
          )}

          {/* Partial text (live) */}
          {partialText && (
            <p
              className={cn(
                "font-body text-muted text-base leading-relaxed",
                finalText ? "mt-2" : ""
              )}
            >
              {partialText}
              <span className="inline-block w-[2px] h-4 bg-accent ml-1 animate-blink" />
            </p>
          )}

          {status === "processing" && !partialText && !finalText && (
            <div className="flex items-center gap-2 text-muted">
              <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-sm">Transcribing audio…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
