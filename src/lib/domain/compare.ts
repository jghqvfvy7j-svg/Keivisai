/** Comparaciones para reportes (semana vs semana anterior, etc.). */

/**
 * Cambio porcentual de `prev` a `curr`, redondeado a 1 decimal.
 * Devuelve null si `prev` es 0 y `curr` no (cambio indefinido / desde cero).
 */
export function percentChange(prev: number, curr: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/** Fracción del periodo [start, end) transcurrida en `now` (0..1). */
export function elapsedFraction(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const done = (now.getTime() - start.getTime()) / total;
  return Math.min(1, Math.max(0, done));
}
