import { fromZonedTime } from 'date-fns-tz';
import { describe, expect, it } from 'vitest';
import { detectConflicts, detectDuplicateEvents, detectIncompleteSessions } from './detect';
import { recommendDeliveryBlock } from './recommend';

const TZ = 'America/New_York';
const t = (ymd: string, hm: string) => fromZonedTime(`${ymd}T${hm}:00`, TZ).toISOString();
const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

describe('detectIncompleteSessions', () => {
  it('marca terminadas sin duración o sin millas', () => {
    const r = detectIncompleteSessions([
      { id: 'a', status: 'terminada', durationMinutes: 180, totalMiles: 50 },
      { id: 'b', status: 'terminada', durationMinutes: null, totalMiles: 50 },
      { id: 'c', status: 'terminada', durationMinutes: 120, totalMiles: null },
      { id: 'd', status: 'planificada', durationMinutes: null, totalMiles: null },
    ]);
    expect(r).toEqual(['b', 'c']);
  });
});

describe('detectDuplicateEvents', () => {
  it('agrupa por dedupeKey y por título+inicio', () => {
    const groups = detectDuplicateEvents([
      { id: '1', title: 'Trabajo', startsAt: t('2026-07-13', '06:30'), endsAt: t('2026-07-13', '15:00') },
      { id: '2', title: 'Trabajo', startsAt: t('2026-07-13', '06:30'), endsAt: t('2026-07-13', '15:00') },
      { id: '3', title: 'Gimnasio', startsAt: t('2026-07-13', '15:30'), endsAt: t('2026-07-13', '17:00') },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(['1', '2']);
  });
});

describe('detectConflicts', () => {
  it('detecta solapamientos', () => {
    const c = detectConflicts([
      { id: 'a', title: 'Trabajo', startsAt: t('2026-07-13', '06:30'), endsAt: t('2026-07-13', '15:00') },
      { id: 'b', title: 'Cita', startsAt: t('2026-07-13', '14:00'), endsAt: t('2026-07-13', '15:30') },
      { id: 'c', title: 'Gimnasio', startsAt: t('2026-07-13', '15:30'), endsAt: t('2026-07-13', '17:00') },
    ]);
    expect(c).toEqual([['a', 'b']]);
  });
});

describe('recommendDeliveryBlock', () => {
  it('propone 3h tras el gimnasio (con buffer de 30 min)', () => {
    const slot = recommendDeliveryBlock([
      { id: 'w', title: 'Trabajo', category: 'trabajo', startsAt: t('2026-07-15', '06:30'), endsAt: t('2026-07-15', '15:00') },
      { id: 'g', title: 'Gimnasio', category: 'gimnasio', startsAt: t('2026-07-15', '15:30'), endsAt: t('2026-07-15', '17:00') },
    ]);
    expect(slot).not.toBeNull();
    expect(hhmm(slot!.startsAt)).toBe('17:30');
    expect(hhmm(slot!.endsAt)).toBe('20:30');
  });

  it('null si no hay trabajo ni gimnasio', () => {
    expect(recommendDeliveryBlock([])).toBeNull();
  });

  it('null si empezaría demasiado tarde', () => {
    const slot = recommendDeliveryBlock([
      { id: 'w', title: 'Trabajo', category: 'trabajo', startsAt: t('2026-07-15', '11:00'), endsAt: t('2026-07-15', '20:00') },
    ]);
    expect(slot).toBeNull();
  });
});
