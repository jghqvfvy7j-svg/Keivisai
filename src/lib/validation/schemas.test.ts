import { describe, expect, it } from 'vitest';
import {
  calendarEventSchema,
  deliverySessionSchema,
  goalSchema,
  scheduleConfirmSchema,
} from './schemas';

describe('deliverySessionSchema (contrato de /api/delivery/sessions)', () => {
  it('acepta una sesión válida', () => {
    const r = deliverySessionSchema.safeParse({ workDate: '2026-07-15', basePay: 87.35, durationMinutes: 180 });
    expect(r.success).toBe(true);
  });
  it('rechaza importes negativos', () => {
    expect(deliverySessionSchema.safeParse({ workDate: '2026-07-15', basePay: -1 }).success).toBe(false);
  });
  it('requiere workDate', () => {
    expect(deliverySessionSchema.safeParse({ basePay: 10 }).success).toBe(false);
  });
});

describe('goalSchema (contrato de /api/goals)', () => {
  it('acepta una meta válida', () => {
    expect(goalSchema.safeParse({ name: 'x', type: 'ganancias', period: 'semanal', targetValue: 300 }).success).toBe(true);
  });
  it('rechaza objetivo <= 0', () => {
    expect(goalSchema.safeParse({ type: 'ganancias', period: 'semanal', targetValue: 0 }).success).toBe(false);
  });
  it('rechaza tipo desconocido', () => {
    expect(goalSchema.safeParse({ type: 'no_existe', period: 'semanal', targetValue: 5 }).success).toBe(false);
  });
});

describe('calendarEventSchema', () => {
  it('rechaza fin anterior al inicio', () => {
    const r = calendarEventSchema.safeParse({
      title: 'x', category: 'trabajo',
      startsAt: '2026-07-15T15:00:00Z', endsAt: '2026-07-15T10:00:00Z',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza título vacío', () => {
    expect(
      calendarEventSchema.safeParse({ title: '', category: 'trabajo', startsAt: 'a', endsAt: 'b' }).success,
    ).toBe(false);
  });
});

describe('scheduleConfirmSchema (contrato de /api/schedule/confirm)', () => {
  it('acepta eventos válidos', () => {
    const r = scheduleConfirmSchema.safeParse({
      events: [{ title: 'Trabajo', category: 'trabajo', startsAt: 'a', endsAt: 'b' }],
    });
    expect(r.success).toBe(true);
  });
  it('rechaza categoría inválida', () => {
    const r = scheduleConfirmSchema.safeParse({
      events: [{ title: 'x', category: 'inventada', startsAt: 'a', endsAt: 'b' }],
    });
    expect(r.success).toBe(false);
  });
});
