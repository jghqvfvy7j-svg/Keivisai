"use client";

// A tiny offline queue for workout session saves. If a save fails (offline),
// we stash the payload in localStorage and retry when connectivity returns.
// This means a user can finish a workout in a dead-zone gym and it still syncs.

const KEY = "gymtrack-pending-sessions";

type PendingSession = { payload: unknown; queuedAt: number };

function read(): PendingSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(items: PendingSession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch { /* storage full or unavailable */ }
}

// Try to save; if it fails, queue it for later. Returns the server response
// (which may include PRs) if saved now, or false if it was queued offline.
export async function saveSessionOrQueue(payload: unknown): Promise<{ ok: boolean; prs?: unknown[] } | false> {
  try {
    const res = await fetch("/api/workouts/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("save failed");
    return await res.json();
  } catch {
    const items = read();
    items.push({ payload, queuedAt: Date.now() });
    write(items);
    return false;
  }
}

// Attempt to flush any queued sessions. Call on app load and when back online.
export async function flushPendingSessions(): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;
  const remaining: PendingSession[] = [];
  let flushed = 0;
  for (const item of items) {
    try {
      const res = await fetch("/api/workouts/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) flushed++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  write(remaining);
  return flushed;
}

export function pendingCount(): number {
  return read().length;
}
