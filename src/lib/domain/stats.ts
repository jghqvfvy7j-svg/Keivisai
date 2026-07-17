import { perHourCents, perMileCents } from './money';

/** Fila de sesión ya almacenada, normalizada para agregación. */
export interface StoredSession {
  workDate: string; // YYYY-MM-DD
  grossCents: number;
  netCents: number;
  minutes: number;
  miles: number;
  zone: string | null;
}

export interface PeriodStats {
  sessions: number;
  grossCents: number;
  netCents: number;
  minutes: number;
  miles: number;
  hourlyCents: number | null;
  perMileCents: number | null;
  avgPerSessionCents: number | null;
  bestDay: { date: string; grossCents: number } | null;
  bestZone: { zone: string; grossCents: number } | null;
}

/** Agrega una lista de sesiones a totales, mejor día y mejor zona. */
export function aggregateSessions(sessions: StoredSession[]): PeriodStats {
  const totals = sessions.reduce(
    (acc, s) => {
      acc.grossCents += s.grossCents;
      acc.netCents += s.netCents;
      acc.minutes += s.minutes;
      acc.miles += s.miles;
      return acc;
    },
    { grossCents: 0, netCents: 0, minutes: 0, miles: 0 },
  );

  const byDay = new Map<string, number>();
  const byZone = new Map<string, number>();
  for (const s of sessions) {
    byDay.set(s.workDate, (byDay.get(s.workDate) ?? 0) + s.grossCents);
    if (s.zone) byZone.set(s.zone, (byZone.get(s.zone) ?? 0) + s.grossCents);
  }

  const pickMax = (m: Map<string, number>) => {
    let best: { key: string; value: number } | null = null;
    for (const [key, value] of m) {
      if (!best || value > best.value) best = { key, value };
    }
    return best;
  };

  const bestDay = pickMax(byDay);
  const bestZone = pickMax(byZone);
  const n = sessions.length;

  return {
    sessions: n,
    grossCents: totals.grossCents,
    netCents: totals.netCents,
    minutes: totals.minutes,
    miles: Math.round(totals.miles * 100) / 100,
    hourlyCents: perHourCents(totals.grossCents, totals.minutes),
    perMileCents: perMileCents(totals.grossCents, totals.miles),
    avgPerSessionCents: n > 0 ? Math.round(totals.grossCents / n) : null,
    bestDay: bestDay ? { date: bestDay.key, grossCents: bestDay.value } : null,
    bestZone: bestZone ? { zone: bestZone.key, grossCents: bestZone.value } : null,
  };
}
