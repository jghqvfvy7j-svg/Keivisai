import { describe, expect, it } from 'vitest';
import { isTokenExpired, resolveConflict, toGoogleEvent } from './google-calendar';

describe('toGoogleEvent', () => {
  it('desactiva recordatorios siempre (spec §20)', () => {
    const g = toGoogleEvent({ title: 'Trabajo', startsAt: '2026-07-15T10:30:00Z', endsAt: '2026-07-15T19:00:00Z' });
    expect(g.reminders).toEqual({ useDefault: false, overrides: [] });
  });

  it('mapea título, horas y zona', () => {
    const g = toGoogleEvent(
      { title: 'Gimnasio', startsAt: '2026-07-15T19:30:00Z', endsAt: '2026-07-15T21:00:00Z', location: 'Gym' },
      'America/New_York',
    );
    expect(g.summary).toBe('Gimnasio');
    expect(g.location).toBe('Gym');
    expect(g.start.timeZone).toBe('America/New_York');
  });
});

describe('isTokenExpired', () => {
  const now = new Date('2026-07-16T12:00:00Z').getTime();
  it('vencido si la expiración ya pasó', () => {
    expect(isTokenExpired('2026-07-16T11:00:00Z', now)).toBe(true);
  });
  it('vencido dentro del margen (skew)', () => {
    expect(isTokenExpired('2026-07-16T12:00:30Z', now, 60)).toBe(true);
  });
  it('válido si falta bastante', () => {
    expect(isTokenExpired('2026-07-16T13:00:00Z', now)).toBe(false);
  });
  it('null => vencido', () => {
    expect(isTokenExpired(null, now)).toBe(true);
  });
});

describe('resolveConflict', () => {
  it('latest: gana el más reciente', () => {
    expect(resolveConflict('2026-07-16T10:00:00Z', '2026-07-16T11:00:00Z')).toBe('remote');
    expect(resolveConflict('2026-07-16T12:00:00Z', '2026-07-16T11:00:00Z')).toBe('local');
  });
  it('empate => local', () => {
    expect(resolveConflict('2026-07-16T10:00:00Z', '2026-07-16T10:00:00Z')).toBe('local');
  });
  it('estrategias fijas', () => {
    expect(resolveConflict('a', 'b', 'local_wins')).toBe('local');
    expect(resolveConflict('a', 'b', 'remote_wins')).toBe('remote');
  });
});
