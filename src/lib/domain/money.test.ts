import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  formatUSD,
  fromCents,
  perHourCents,
  perMileCents,
  toCents,
} from './money';

describe('money: conversión', () => {
  it('convierte USD a centavos', () => {
    expect(toCents(29.12)).toBe(2912);
    expect(toCents(0)).toBe(0);
    expect(toCents(87.35)).toBe(8735);
  });

  it('rechaza importes negativos', () => {
    expect(() => toCents(-1)).toThrow(DomainValidationError);
  });

  it('rechaza NaN', () => {
    expect(() => toCents(Number.NaN)).toThrow(DomainValidationError);
  });

  it('formatea a USD', () => {
    expect(fromCents(2912)).toBe(29.12);
    expect(formatUSD(2912)).toBe('$29.12');
    expect(formatUSD(8085)).toBe('$80.85');
  });
});

describe('money: tasas (con guarda de división por cero)', () => {
  it('calcula ganancia por hora', () => {
    // 87.35 en 3 horas => 29.12/h
    expect(perHourCents(8735, 180)).toBe(2912);
  });

  it('devuelve null si no hay duración', () => {
    expect(perHourCents(8735, 0)).toBeNull();
    expect(perHourCents(8735, null)).toBeNull();
    expect(perHourCents(8735, -10)).toBeNull();
  });

  it('calcula ganancia por milla', () => {
    // 87.35 en 54.2 millas => 1.61/milla
    expect(perMileCents(8735, 54.2)).toBe(161);
  });

  it('devuelve null si no hay millas', () => {
    expect(perMileCents(8735, 0)).toBeNull();
    expect(perMileCents(8735, null)).toBeNull();
  });
});
