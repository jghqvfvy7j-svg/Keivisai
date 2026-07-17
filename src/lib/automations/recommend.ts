import type { EventLike } from './detect';

export interface Slot {
  startsAt: string;
  endsAt: string;
}

const TZ = 'America/New_York';

function hhmm(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(iso),
  );
}

/**
 * Recomienda un bloque de DoorDash tras el trabajo/gimnasio del día.
 * - Empieza `bufferMin` después del último turno/gimnasio.
 * - Dura `durationMin` (3h por defecto).
 * - No arranca más tarde de `latestStart` ni se solapa con otros eventos.
 * Devuelve null si no hay hueco razonable (p. ej. día libre).
 */
export function recommendDeliveryBlock(
  dayEvents: EventLike[],
  opts: { durationMin?: number; bufferMin?: number; latestStart?: string; tz?: string } = {},
): Slot | null {
  const tz = opts.tz ?? TZ;
  const durationMin = opts.durationMin ?? 180;
  const bufferMin = opts.bufferMin ?? 30;
  const latestStart = opts.latestStart ?? '20:00';

  const anchors = dayEvents.filter((e) => e.category === 'trabajo' || e.category === 'gimnasio');
  if (anchors.length === 0) return null;

  const lastEnd = anchors.reduce((max, e) => (e.endsAt > max ? e.endsAt : max), anchors[0].endsAt);
  const start = new Date(new Date(lastEnd).getTime() + bufferMin * 60000);
  const end = new Date(start.getTime() + durationMin * 60000);

  if (hhmm(start.toISOString(), tz) > latestStart) return null;

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const overlaps = dayEvents.some(
    (e) => (e.blocksTime ?? true) && startIso < e.endsAt && e.startsAt < endIso,
  );
  if (overlaps) return null;

  return { startsAt: startIso, endsAt: endIso };
}
