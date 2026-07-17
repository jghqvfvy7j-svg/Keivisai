import { describe, expect, it } from 'vitest';
import { computeGoalProgress } from './goals';

describe('metas: dirección min (alcanzar objetivo)', () => {
  it('en camino cuando el avance supera el tiempo transcurrido', () => {
    const r = computeGoalProgress({ target: 300, current: 200, elapsedFraction: 0.5 });
    expect(r.status).toBe('en_camino');
    expect(r.remaining).toBe(100);
    expect(r.onPace).toBe(true);
  });

  it('atrasado cuando el avance va por detrás del tiempo', () => {
    const r = computeGoalProgress({ target: 300, current: 50, elapsedFraction: 0.8 });
    expect(r.status).toBe('atrasado');
    expect(r.onPace).toBe(false);
  });

  it('completado al alcanzar el objetivo', () => {
    const r = computeGoalProgress({ target: 300, current: 300, elapsedFraction: 0.9 });
    expect(r.status).toBe('completado');
    expect(r.remaining).toBe(0);
  });

  it('excedido al superar el objetivo', () => {
    const r = computeGoalProgress({ target: 300, current: 360, elapsedFraction: 1 });
    expect(r.status).toBe('excedido');
    expect(r.percentage).toBeCloseTo(1.2);
  });
});

describe('metas: dirección max (techo / presupuesto)', () => {
  it('en camino mientras se está por debajo del techo', () => {
    const r = computeGoalProgress({ target: 40, current: 25, elapsedFraction: 0.5, direction: 'max' });
    expect(r.status).toBe('en_camino');
    expect(r.remaining).toBe(15); // presupuesto restante
  });

  it('excedido al pasar el techo', () => {
    const r = computeGoalProgress({ target: 40, current: 52, elapsedFraction: 0.7, direction: 'max' });
    expect(r.status).toBe('excedido');
    expect(r.remaining).toBe(-12);
  });
});

describe('metas: casos límite', () => {
  it('objetivo 0 se considera completado (min)', () => {
    expect(computeGoalProgress({ target: 0, current: 0, elapsedFraction: 0 }).status).toBe('completado');
  });
  it('current negativo se trata como 0', () => {
    const r = computeGoalProgress({ target: 100, current: -5, elapsedFraction: 0.1 });
    expect(r.percentage).toBe(0);
  });
});
