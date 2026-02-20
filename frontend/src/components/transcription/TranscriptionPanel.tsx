"use client";

import { useTranscription } from "@/hooks/useTranscription";
import { RecordingControls } from "./RecordingControls";
import { TranscriptDisplay } from "./TranscriptDisplay";
import { SessionStats } from "./SessionStats";
import { SessionHistory } from "./SessionHistory";

export function TranscriptionPanel() {
  const {
    status,
    partialText,
    finalText,
    wordCount,
    duration,
    errorMessage,
    sessionId,
    startSession,
    stopSession,
    cancelSession,
    reset,
  } = useTranscription();

  return (
    <div className="space-y-8">
      {/* Recording Controls */}
      <div className="border border-border bg-surface p-8">
        <RecordingControls
          status={status}
          duration={duration}
          errorMessage={errorMessage}
          onStart={startSession}
          onStop={stopSession}
          onCancel={cancelSession}
          onReset={reset}
        />
      </div>

      {/* Live Transcript */}
      <TranscriptDisplay
        status={status}
        partialText={partialText}
        finalText={finalText}
        errorMessage={errorMessage}
      />

      {/* Stats — shown only after completion */}
      {status === "done" && (
        <SessionStats
          wordCount={wordCount}
          duration={duration}
          sessionId={sessionId}
        />
      )}

      {/* Session History */}
      <SessionHistory />
    </div>
  );
}
