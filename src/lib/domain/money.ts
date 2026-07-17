import type { Cents } from './types';

/** Error de validación del dominio (importes negativos, etc.). */
export class DomainValidationError extends Error {}

/** Convierte un importe en USD a centavos enteros. Rechaza negativos y NaN. */
export function toCents(amount: number, field = 'amount'): Cents {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new DomainValidationError(`${field} no es un número válido`);
  }
  if (amount < 0) {
    throw new DomainValidationError(`${field} no puede ser negativo`);
  }
  return Math.round(amount * 100);
}

/** Centavos -> número USD con 2 decimales. */
export function fromCents(cents: Cents): number {
  return Math.round(cents) / 100;
}

/** Formatea centavos como "$29.12". */
export function formatUSD(cents: Cents): string {
  return `$${fromCents(cents).toFixed(2)}`;
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Ganancia por hora en centavos. Devuelve null si minutes <= 0
 * (evita división por cero y sesiones sin duración).
 */
export function perHourCents(grossCents: Cents, minutes: number | null): Cents | null {
  if (minutes == null || minutes <= 0) return null;
  return Math.round((grossCents * 60) / minutes);
}

/**
 * Ganancia por milla en centavos. Devuelve null si miles <= 0.
 */
export function perMileCents(grossCents: Cents, miles: number | null): Cents | null {
  if (miles == null || miles <= 0) return null;
  return Math.round(grossCents / miles);
}
