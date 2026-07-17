import { describe, expect, it } from 'vitest';
import { computeDeliveryMetrics } from './delivery';
import { DomainValidationError } from './money';
import type { DeliverySessionInput } from './types';

const base: DeliverySessionInput = {
  basePay: 52,
  tips: 31.35,
  bonuses: 4,
  otherIncome: 0,
  fuelExpense: 6.5,
  tollExpense: 0,
  parkingExpense: 0,
  otherExpense: 0,
  durationMinutes: 180,
  startingOdometer: 40000,
  endingOdometer: 40054.2,
};

describe('delivery: sesión completa (ejemplo del spec)', () => {
  const m = computeDeliveryMetrics(base);

  it('bruto, gastos y neto', () => {
    expect(m.grossCents).toBe(8735); // $87.35
    expect(m.expenseCents).toBe(650); // $6.50
    expect(m.netCents).toBe(8085); // $80.85
  });

  it('millas totales', () => {
    expect(m.totalMiles).toBe(54.2);
  });

  it('tasas por hora y por milla', () => {
    expect(m.hourlyRateCents).toBe(2912); // $29.12/h
    expect(m.perMileCents).toBe(161); // $1.61/milla
    expect(m.netHourlyCents).toBe(2695); // $26.95/h neto
    expect(m.netPerMileCents).toBe(149); // $1.49/milla neto
  });
});

describe('delivery: sesión incompleta', () => {
  it('sin duración ni odómetro => tasas y millas en null', () => {
    const m = computeDeliveryMetrics({
      ...base,
      durationMinutes: null,
      startingOdometer: null,
      endingOdometer: null,
    });
    expect(m.grossCents).toBe(8735);
    expect(m.hourlyRateCents).toBeNull();
    expect(m.totalMiles).toBeNull();
    expect(m.perMileCents).toBeNull();
  });
});

describe('delivery: validación', () => {
  it('rechaza importes negativos', () => {
    expect(() => computeDeliveryMetrics({ ...base, basePay: -5 })).toThrow(
      DomainValidationError,
    );
  });

  it('rechaza odómetro final menor que inicial', () => {
    expect(() =>
      computeDeliveryMetrics({ ...base, startingOdometer: 100, endingOdometer: 50 }),
    ).toThrow(DomainValidationError);
  });
});
