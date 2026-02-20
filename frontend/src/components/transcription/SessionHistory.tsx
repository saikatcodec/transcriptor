"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, FileText } from "lucide-react";
import { useSessions, useSession } from "@/hooks/useSessions";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDuration, truncate } from "@/lib/utils";
import Link from "next/link";

function SessionDetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { session, loading } = useSession(id);

  return (
    <div
      className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border w-full max-w-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm text-muted uppercase tracking-widest">
            Session Detail
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-paper transition-colors font-mono text-xs"
          >
            [ close ]
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted py-8">
            <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-sm">Loading…</span>
          </div>
        ) : session ? (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Badge variant="muted">{session.word_count} words</Badge>
              <Badge variant="muted">{formatDuration(session.duration)}</Badge>
              <Badge variant="muted">{formatDate(session.created_at)}</Badge>
            </div>
            <div className="border border-border bg-ink p-4">
              <p className="font-body text-paper/90 text-sm leading-relaxed">
                {session.transcript || (
                  <span className="text-muted italic">
                    No transcript available
                  </span>
                )}
              </p>
            </div>
            <p className="text-xs font-mono text-muted">ID: {session.id}</p>
          </div>
        ) : (
          <p className="text-muted font-mono text-sm">Session not found</p>
        )}
      </div>
    </div>
  );
}

export function SessionHistory() {
  const { sessions, loading, error, refetch } = useSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="border border-border">
        {/* Header */}
        <button
          onClick={() => {
            setExpanded((v) => !v);
            if (!expanded) refetch();
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted" />
            <span className="font-mono text-sm text-paper uppercase tracking-widest">
              Past Sessions
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </button>

        {/* List */}
        {expanded && (
          <>
            <div className="border-t border-border divide-y divide-border">
              {loading && (
                <div className="flex items-center gap-2 p-4 text-muted">
                  <span className="w-3 h-3 border border-muted border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-xs">Loading sessions…</span>
                </div>
              )}

              {error && (
                <p className="p-4 text-xs font-mono text-accent">{error}</p>
              )}

              {!loading && !error && sessions.length === 0 && (
                <p className="p-4 text-xs font-mono text-muted">
                  No sessions recorded yet.
                </p>
              )}

              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="w-full text-left p-4 hover:bg-surface-2 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-paper/80 text-sm leading-relaxed truncate group-hover:text-paper transition-colors">
                        {truncate(s.transcript_preview || "—", 80)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs font-mono text-muted">
                          <Clock className="w-3 h-3" />
                          {formatDate(s.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Badge variant="muted">{s.word_count}w</Badge>
                      <Badge variant="muted">
                        {formatDuration(s.duration)}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <Link href={"/sessions"} className="p-1">
              See All...
            </Link>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <SessionDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
