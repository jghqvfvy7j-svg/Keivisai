/** Tipos del dominio. El dinero se maneja en centavos (enteros) para evitar
 *  errores de punto flotante. Las millas en unidades con 2 decimales. */

export type Cents = number; // entero

export interface DeliverySessionInput {
  basePay: number;
  tips: number;
  bonuses: number;
  otherIncome: number;
  fuelExpense: number;
  tollExpense: number;
  parkingExpense: number;
  otherExpense: number;
  durationMinutes: number | null; // null => sesión incompleta
  startingOdometer: number | null;
  endingOdometer: number | null;
}

export interface DeliveryMetrics {
  grossCents: Cents;
  expenseCents: Cents;
  netCents: Cents;
  totalMiles: number | null;
  hourlyRateCents: Cents | null; // null si no hay duración
  netHourlyCents: Cents | null;
  perMileCents: Cents | null; // null si no hay millas
  netPerMileCents: Cents | null;
}

export type EventCategory =
  | 'trabajo'
  | 'almuerzo'
  | 'gimnasio'
  | 'delivery'
  | 'descanso'
  | 'personal'
  | 'cita'
  | 'proyecto'
  | 'otro';

export interface CalendarEvent {
  id: string;
  title: string;
  category: EventCategory;
  startsAt: string; // ISO
  endsAt: string; // ISO
}
