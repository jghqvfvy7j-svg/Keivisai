import { describe, expect, it } from 'vitest';
import { elapsedFraction, percentChange } from './compare';

describe('percentChange', () => {
  it('calcula subida', () => {
    expect(percentChange(100, 150)).toBe(50);
  });
  it('calcula bajada', () => {
    expect(percentChange(200, 150)).toBe(-25);
  });
  it('sin cambio', () => {
    expect(percentChange(100, 100)).toBe(0);
  });
  it('desde cero => null (indefinido)', () => {
    expect(percentChange(0, 80)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe('elapsedFraction', () => {
  const start = new Date('2026-07-12T00:00:00Z');
  const end = new Date('2026-07-19T00:00:00Z');
  it('mitad del periodo', () => {
    expect(elapsedFraction(start, end, new Date('2026-07-15T12:00:00Z'))).toBeCloseTo(0.5);
  });
  it('antes del inicio => 0', () => {
    expect(elapsedFraction(start, end, new Date('2026-07-10T00:00:00Z'))).toBe(0);
  });
  it('después del fin => 1', () => {
    expect(elapsedFraction(start, end, new Date('2026-07-30T00:00:00Z'))).toBe(1);
  });
});
