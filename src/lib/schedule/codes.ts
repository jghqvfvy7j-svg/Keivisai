import { fromZonedTime } from 'date-fns-tz';

/** Configuración de turnos (editable en Preferencias más adelante). */
export interface ScheduleConfig {
  am: { start: string; end: string };
  pm: { start: string; end: string };
  lunch: { start: string; end: string };
}

export const DEFAULT_CONFIG: ScheduleConfig = {
  am: { start: '06:30', end: '15:00' },
  pm: { start: '11:00', end: '20:30' },
  lunch: { start: '12:00', end: '13:00' },
};

export type KnownCode = 'AM' | 'PM' | 'UTILITY_AM' | 'UTILITY_PM' | 'OFF';

/** Normaliza un código crudo del horario a uno conocido (o UNKNOWN). */
export function normalizeCode(raw: string): KnownCode | 'UNKNOWN' {
  const c = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (c === 'AM') return 'AM';
  if (c === 'PM') return 'PM';
  if (['OFF', 'O', 'LIBRE', 'DESCANSO', 'X'].includes(c)) return 'OFF';
  if (['UTILITY_AM', 'UTIL_AM', 'UAM'].includes(c)) return 'UTILITY_AM';
  if (['UTILITY_PM', 'UTIL_PM', 'UPM'].includes(c)) return 'UTILITY_PM';
  return 'UNKNOWN';
}

function iso(dateYmd: string, hhmm: string, tz: string): string {
  return fromZonedTime(`${dateYmd}T${hhmm}:00`, tz).toISOString();
}

export interface ShiftTimes {
  startsAt: string;
  endsAt: string;
  lunchStart: string | null;
  lunchEnd: string | null;
  label: string;
}

/**
 * Convierte un código + fecha a horarios ISO.
 * - OFF => null (día libre, sin eventos).
 * - código desconocido => 'UNKNOWN' (requiere confirmación del usuario).
 * El almuerzo se incluye sólo si cae dentro del turno.
 */
export function codeToTimes(
  code: string,
  dateYmd: string,
  config: ScheduleConfig = DEFAULT_CONFIG,
  tz = 'America/New_York',
): ShiftTimes | null | 'UNKNOWN' {
  const k = normalizeCode(code);
  if (k === 'OFF') return null;
  if (k === 'UNKNOWN') return 'UNKNOWN';

  const isAm = k === 'AM' || k === 'UTILITY_AM';
  const slot = isAm ? config.am : config.pm;
  const label = k.startsWith('UTILITY') ? 'Utility' : 'Trabajo';

  const startsAt = iso(dateYmd, slot.start, tz);
  const endsAt = iso(dateYmd, slot.end, tz);
  const ls = iso(dateYmd, config.lunch.start, tz);
  const le = iso(dateYmd, config.lunch.end, tz);
  const within = ls >= startsAt && le <= endsAt;

  return {
    startsAt,
    endsAt,
    lunchStart: within ? ls : null,
    lunchEnd: within ? le : null,
    label,
  };
}
