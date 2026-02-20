import type { Session, SessionListItem } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getSessions: (): Promise<SessionListItem[]> =>
    request<SessionListItem[]>("/sessions"),

  getSession: (id: string): Promise<Session> =>
    request<Session>(`/sessions/${id}`),
};
