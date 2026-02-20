"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Session, SessionListItem } from "@/types";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}

export function useSession(id: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .getSession(id)
      .then(setSession)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to fetch session")
      )
      .finally(() => setLoading(false));
  }, [id]);

  return { session, loading, error };
}
