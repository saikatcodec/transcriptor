"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { useSessions, useSession } from "@/hooks/useSessions";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDuration, truncate } from "@/lib/utils";

function SessionDetail({ id }: { id: string }) {
  const { session, loading, error } = useSession(id);

  if (loading)
    return (
      <div className="flex items-center gap-2 p-6 text-muted">
        <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-sm">Loading…</span>
      </div>
    );

  if (error)
    return <p className="p-6 font-mono text-sm text-accent">{error}</p>;

  if (!session) return null;

  return (
    <div className="border border-border bg-surface p-6 animate-slide-up">
      <div className="flex flex-wrap gap-3 mb-4">
        <Badge variant="muted">{session.word_count} words</Badge>
        <Badge variant="muted">{formatDuration(session.duration)}</Badge>
        <Badge variant="muted">{formatDate(session.created_at)}</Badge>
      </div>
      <div className="border border-border bg-ink p-4 mb-3">
        <p className="font-body text-paper/90 text-sm leading-relaxed whitespace-pre-wrap">
          {session.transcript || <span className="text-muted italic">No transcript</span>}
        </p>
      </div>
      <p className="text-xs font-mono text-muted">ID: {session.id}</p>
    </div>
  );
}

export default function SessionsPage() {
  const { sessions, loading, error } = useSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <main className="min-h-dvh bg-ink">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted hover:text-paper transition-colors font-mono text-xs"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </Link>
        <span className="font-mono text-xs tracking-[0.3em] uppercase text-paper/70">
          Session History
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl text-paper mb-2">
            All Sessions
          </h1>
          <p className="font-body text-muted text-sm">
            Browse and review your past transcription sessions.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted">
            <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-sm">Loading sessions…</span>
          </div>
        )}

        {error && (
          <p className="font-mono text-sm text-accent">{error}</p>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="border border-border bg-surface p-8 text-center">
            <FileText className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="font-mono text-sm text-muted">
              No sessions recorded yet. Start transcribing!
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="space-y-3">
              <button
                onClick={() =>
                  setSelectedId(selectedId === s.id ? null : s.id)
                }
                className="w-full text-left border border-border bg-surface hover:bg-surface-2 p-4 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-paper/80 text-sm leading-relaxed group-hover:text-paper transition-colors">
                      {truncate(s.transcript_preview || "—", 100)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-muted" />
                      <span className="font-mono text-xs text-muted">
                        {formatDate(s.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant="muted">{s.word_count}w</Badge>
                    <Badge variant="muted">{formatDuration(s.duration)}</Badge>
                  </div>
                </div>
              </button>

              {selectedId === s.id && <SessionDetail id={s.id} />}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
