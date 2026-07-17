import type { DeliveryMetrics, DeliverySessionInput } from './types';
import {
  DomainValidationError,
  perHourCents,
  perMileCents,
  sumCents,
  toCents,
} from './money';

/**
 * Calcula las métricas de una sesión de delivery de forma segura:
 * - dinero en centavos,
 * - rechaza importes negativos,
 * - millas y tasas devuelven null cuando no se pueden calcular (sin duración,
 *   sin millas, o división por cero).
 */
export function computeDeliveryMetrics(input: DeliverySessionInput): DeliveryMetrics {
  const grossCents = sumCents([
    toCents(input.basePay, 'basePay'),
    toCents(input.tips, 'tips'),
    toCents(input.bonuses, 'bonuses'),
    toCents(input.otherIncome, 'otherIncome'),
  ]);

  const expenseCents = sumCents([
    toCents(input.fuelExpense, 'fuelExpense'),
    toCents(input.tollExpense, 'tollExpense'),
    toCents(input.parkingExpense, 'parkingExpense'),
    toCents(input.otherExpense, 'otherExpense'),
  ]);

  const netCents = grossCents - expenseCents;

  let totalMiles: number | null = null;
  if (input.startingOdometer != null && input.endingOdometer != null) {
    const miles = input.endingOdometer - input.startingOdometer;
    if (miles < 0) {
      throw new DomainValidationError('El odómetro final no puede ser menor que el inicial');
    }
    totalMiles = Math.round(miles * 100) / 100;
  }

  return {
    grossCents,
    expenseCents,
    netCents,
    totalMiles,
    hourlyRateCents: perHourCents(grossCents, input.durationMinutes),
    netHourlyCents: perHourCents(netCents, input.durationMinutes),
    perMileCents: perMileCents(grossCents, totalMiles),
    netPerMileCents: perMileCents(netCents, totalMiles),
  };
}
