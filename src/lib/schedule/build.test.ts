import { describe, expect, it } from 'vitest';
import { buildEventsFromSchedule } from './build';
import { codeToTimes, normalizeCode } from './codes';

const TZ = 'America/New_York';
function nyHM(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

describe('normalizeCode', () => {
  it('reconoce variantes', () => {
    expect(normalizeCode('am')).toBe('AM');
    expect(normalizeCode(' Off ')).toBe('OFF');
    expect(normalizeCode('Utility AM')).toBe('UTILITY_AM');
    expect(normalizeCode('zzz')).toBe('UNKNOWN');
  });
});

describe('codeToTimes', () => {
  it('AM => 06:30–15:00 con almuerzo dentro', () => {
    const t = codeToTimes('AM', '2026-07-13');
    if (!t || t === 'UNKNOWN') throw new Error('esperaba horarios');
    expect(nyHM(t.startsAt)).toBe('06:30');
    expect(nyHM(t.endsAt)).toBe('15:00');
    expect(t.lunchStart).not.toBeNull();
  });
  it('OFF => null', () => {
    expect(codeToTimes('OFF', '2026-07-13')).toBeNull();
  });
  it('desconocido => UNKNOWN', () => {
    expect(codeToTimes('ZZ', '2026-07-13')).toBe('UNKNOWN');
  });
});

describe('buildEventsFromSchedule', () => {
  const rows = [
    { date: '2026-07-12', code: 'AM' },
    { date: '2026-07-13', code: 'OFF' },
    { date: '2026-07-14', code: 'PM' },
    { date: '2026-07-15', code: 'XY' }, // desconocido
    { date: 'mal', code: 'AM' }, // fecha inválida
  ];
  const r = buildEventsFromSchedule(rows, undefined, TZ);

  it('AM y PM generan trabajo + almuerzo; OFF no genera', () => {
    // 2 (AM) + 2 (PM) = 4 eventos
    expect(r.events).toHaveLength(4);
    expect(r.offDays).toContain('2026-07-13');
  });
  it('reporta código desconocido y fecha inválida', () => {
    expect(r.errors).toHaveLength(2);
    expect(r.errors.map((e) => e.reason)).toContain('código desconocido');
    expect(r.errors.map((e) => e.reason)).toContain('fecha inválida');
  });
  it('PM empieza a las 11:00', () => {
    const pm = r.events.find((e) => e.category === 'trabajo' && nyHM(e.startsAt) === '11:00');
    expect(pm).toBeTruthy();
  });
});
