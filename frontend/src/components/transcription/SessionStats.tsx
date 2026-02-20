"use client";

import { StatCard } from "@/components/ui/StatCard";
import { formatDuration } from "@/lib/utils";

interface SessionStatsProps {
  wordCount: number;
  duration: number;
  sessionId: string | null;
}

export function SessionStats({ wordCount, duration, sessionId }: SessionStatsProps) {
  const wordsPerMinute =
    duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

  return (
    <div className="animate-slide-up">
      <h3 className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
        Session Metrics
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Words" value={wordCount} />
        <StatCard label="Duration" value={formatDuration(duration)} />
        <StatCard label="WPM" value={wordsPerMinute} />
      </div>
      {sessionId && (
        <p className="text-xs font-mono text-muted mt-3">
          Session ID:{" "}
          <span className="text-paper/60">{sessionId}</span>
        </p>
      )}
    </div>
  );
}
