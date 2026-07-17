import { describe, expect, it } from 'vitest';
import { aggregateSessions, type StoredSession } from './stats';

const sessions: StoredSession[] = [
  { workDate: '2026-07-13', grossCents: 8735, netCents: 8085, minutes: 180, miles: 54.2, zone: 'Downtown' },
  { workDate: '2026-07-15', grossCents: 6000, netCents: 5500, minutes: 120, miles: 30, zone: 'Downtown' },
  { workDate: '2026-07-15', grossCents: 4000, netCents: 3800, minutes: 90, miles: 20, zone: 'Oakley' },
];

describe('aggregateSessions', () => {
  const s = aggregateSessions(sessions);

  it('suma totales', () => {
    expect(s.sessions).toBe(3);
    expect(s.grossCents).toBe(18735);
    expect(s.netCents).toBe(17385);
    expect(s.minutes).toBe(390);
    expect(s.miles).toBe(104.2);
  });

  it('tasas por hora y por milla del periodo', () => {
    // 18735 * 60 / 390 = 2882
    expect(s.hourlyCents).toBe(2882);
    // 18735 / 104.2 = 179.8 -> 180
    expect(s.perMileCents).toBe(180);
  });

  it('promedio por sesión', () => {
    expect(s.avgPerSessionCents).toBe(6245); // 18735 / 3
  });

  it('mejor día (2026-07-15 suma 10000)', () => {
    expect(s.bestDay).toEqual({ date: '2026-07-15', grossCents: 10000 });
  });

  it('mejor zona (Downtown suma 14735)', () => {
    expect(s.bestZone).toEqual({ zone: 'Downtown', grossCents: 14735 });
  });

  it('lista vacía => nulls y ceros', () => {
    const e = aggregateSessions([]);
    expect(e.sessions).toBe(0);
    expect(e.hourlyCents).toBeNull();
    expect(e.bestDay).toBeNull();
    expect(e.bestZone).toBeNull();
    expect(e.avgPerSessionCents).toBeNull();
  });
});
