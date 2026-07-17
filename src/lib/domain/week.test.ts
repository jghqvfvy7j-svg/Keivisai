import { fromZonedTime } from 'date-fns-tz';
import { describe, expect, it } from 'vitest';
import { durationMinutes, startOfWeekSunday, weekRange } from './week';

const TZ = 'America/New_York';

function nyParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const p = fmt.formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}`;
}

describe('semana empieza en domingo (America/New_York)', () => {
  it('miércoles 2026-07-15 => domingo 2026-07-12 00:00', () => {
    const wed = fromZonedTime('2026-07-15T18:00:00', TZ);
    expect(nyParts(startOfWeekSunday(wed, TZ))).toBe('2026-07-12 00:00');
  });

  it('un domingo se mapea a sí mismo', () => {
    const sun = fromZonedTime('2026-07-12T09:00:00', TZ);
    expect(nyParts(startOfWeekSunday(sun, TZ))).toBe('2026-07-12 00:00');
  });

  it('un sábado se mapea al domingo anterior', () => {
    const sat = fromZonedTime('2026-07-18T23:30:00', TZ);
    expect(nyParts(startOfWeekSunday(sat, TZ))).toBe('2026-07-12 00:00');
  });

  it('el rango de semana abarca 7 días', () => {
    const wed = fromZonedTime('2026-07-15T18:00:00', TZ);
    const { start, end } = weekRange(wed, TZ);
    expect(nyParts(start)).toBe('2026-07-12 00:00');
    expect(nyParts(end)).toBe('2026-07-19 00:00');
  });
});

describe('duración correcta a través de cambios de horario (DST)', () => {
  it('turno normal 06:30-15:00 = 510 min', () => {
    const s = fromZonedTime('2026-05-04T06:30:00', TZ).toISOString();
    const e = fromZonedTime('2026-05-04T15:00:00', TZ).toISOString();
    expect(durationMinutes(s, e)).toBe(510);
  });

  it('fall-back (nov 2025): 01:00-03:00 local = 180 min (hora extra)', () => {
    const s = fromZonedTime('2025-11-02T01:00:00', TZ).toISOString();
    const e = fromZonedTime('2025-11-02T03:00:00', TZ).toISOString();
    expect(durationMinutes(s, e)).toBe(180);
  });

  it('spring-forward (mar 2026): 01:00-03:00 local = 60 min (hora perdida)', () => {
    const s = fromZonedTime('2026-03-08T01:00:00', TZ).toISOString();
    const e = fromZonedTime('2026-03-08T03:00:00', TZ).toISOString();
    expect(durationMinutes(s, e)).toBe(60);
  });
});
