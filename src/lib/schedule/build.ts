import { codeToTimes, DEFAULT_CONFIG, type ScheduleConfig } from './codes';

export interface RawRow {
  date: string; // YYYY-MM-DD
  code: string;
}

export interface PreviewEvent {
  title: string;
  category: 'trabajo' | 'almuerzo';
  startsAt: string;
  endsAt: string;
}

export interface BuildResult {
  events: PreviewEvent[];
  errors: { date: string; code: string; reason: string }[];
  offDays: string[];
}

/**
 * Construye los eventos (trabajo + almuerzo) a partir de las filas extraídas.
 * - OFF => día libre, no genera eventos.
 * - código desconocido => se reporta como error para que el usuario decida.
 * Nunca guarda nada: sólo produce la vista previa.
 */
export function buildEventsFromSchedule(
  rows: RawRow[],
  config: ScheduleConfig = DEFAULT_CONFIG,
  tz = 'America/New_York',
): BuildResult {
  const events: PreviewEvent[] = [];
  const errors: BuildResult['errors'] = [];
  const offDays: string[] = [];

  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      errors.push({ date: r.date, code: r.code, reason: 'fecha inválida' });
      continue;
    }
    const t = codeToTimes(r.code, r.date, config, tz);
    if (t === null) {
      offDays.push(r.date);
      continue;
    }
    if (t === 'UNKNOWN') {
      errors.push({ date: r.date, code: r.code, reason: 'código desconocido' });
      continue;
    }
    events.push({ title: t.label, category: 'trabajo', startsAt: t.startsAt, endsAt: t.endsAt });
    if (t.lunchStart && t.lunchEnd) {
      events.push({ title: 'Almuerzo', category: 'almuerzo', startsAt: t.lunchStart, endsAt: t.lunchEnd });
    }
  }

  return { events, errors, offDays };
}
