/** Detectores para las automatizaciones silenciosas (puros y probados). */

export interface SessionLike {
  id: string;
  status: string;
  durationMinutes: number | null;
  totalMiles: number | null;
}

/** Sesiones marcadas como terminadas pero sin duración o sin millas. */
export function detectIncompleteSessions(sessions: SessionLike[]): string[] {
  return sessions
    .filter((s) => s.status === 'terminada' && (s.durationMinutes == null || s.totalMiles == null))
    .map((s) => s.id);
}

export interface EventLike {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  blocksTime?: boolean;
  dedupeKey?: string | null;
  category?: string;
}

/** Grupos de eventos duplicados (mismo dedupeKey, o mismo título + inicio). */
export function detectDuplicateEvents(events: EventLike[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const e of events) {
    const key = e.dedupeKey ? `k:${e.dedupeKey}` : `t:${e.title}|${e.startsAt}`;
    groups.set(key, [...(groups.get(key) ?? []), e.id]);
  }
  return [...groups.values()].filter((ids) => ids.length > 1);
}

/** Pares de eventos que se solapan (ambos ocupan tiempo, no descanso). */
export function detectConflicts(events: EventLike[]): [string, string][] {
  const blocking = events.filter((e) => (e.blocksTime ?? true) && e.category !== 'descanso');
  const conflicts: [string, string][] = [];
  for (let i = 0; i < blocking.length; i++) {
    for (let j = i + 1; j < blocking.length; j++) {
      const a = blocking[i];
      const b = blocking[j];
      if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        conflicts.push([a.id, b.id]);
      }
    }
  }
  return conflicts;
}
