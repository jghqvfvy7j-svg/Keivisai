import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/** Partes de fecha (año, mes, día, día de la semana 0=domingo) en una zona. */
function zonedParts(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    dow: weekdayMap[get('weekday')],
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Devuelve el instante (UTC) del domingo 00:00 hora local que inicia la semana
 * a la que pertenece `instant`, en la zona indicada. La semana empieza en DOMINGO.
 */
export function startOfWeekSunday(instant: Date, timeZone: string): Date {
  const { year, month, day, dow } = zonedParts(instant, timeZone);
  // Restar `dow` días a la fecha local para llegar al domingo.
  const localMidday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  localMidday.setUTCDate(localMidday.getUTCDate() - dow);
  const y = localMidday.getUTCFullYear();
  const m = localMidday.getUTCMonth() + 1;
  const d = localMidday.getUTCDate();
  // Convertir "YYYY-MM-DD 00:00 local" a instante UTC (respeta DST).
  return fromZonedTime(`${y}-${pad(m)}-${pad(d)}T00:00:00`, timeZone);
}

/** Rango [inicio, fin) de la semana (domingo a domingo siguiente). */
export function weekRange(instant: Date, timeZone: string): { start: Date; end: Date } {
  const start = startOfWeekSunday(instant, timeZone);
  // Sumar 7 días en horas locales para respetar DST correctamente.
  const local = toZonedTime(start, timeZone);
  local.setDate(local.getDate() + 7);
  const end = fromZonedTime(local, timeZone);
  return { start, end };
}

/** Rango [inicio, fin) del mes local que contiene `instant`. */
export function monthRange(instant: Date, timeZone: string): { start: Date; end: Date } {
  const { year, month } = zonedParts(instant, timeZone);
  const start = fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, timeZone);
  const ny = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const end = fromZonedTime(`${ny.y}-${pad(ny.m)}-01T00:00:00`, timeZone);
  return { start, end };
}

/** Rango [inicio, fin) del día local que contiene `instant`. */
export function dayRange(instant: Date, timeZone: string): { start: Date; end: Date } {
  const { year, month, day } = zonedParts(instant, timeZone);
  const start = fromZonedTime(`${year}-${pad(month)}-${pad(day)}T00:00:00`, timeZone);
  const local = toZonedTime(start, timeZone);
  local.setDate(local.getDate() + 1);
  const end = fromZonedTime(local, timeZone);
  return { start, end };
}

/** Duración en minutos entre dos instantes ISO (correcta a través de DST). */
export function durationMinutes(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.round(ms / 60000);
}
