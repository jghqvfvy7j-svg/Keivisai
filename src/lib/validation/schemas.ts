import { z } from 'zod';

/** Esquemas Zod compartidos entre formularios, API y herramientas del asistente. */

const money = z.number().nonnegative().finite();

export const deliverySessionSchema = z.object({
  platform: z.string().default('doordash'),
  workDate: z.string(), // YYYY-MM-DD
  basePay: money.default(0),
  tips: money.default(0),
  bonuses: money.default(0),
  otherIncome: money.default(0),
  fuelExpense: money.default(0),
  tollExpense: money.default(0),
  parkingExpense: money.default(0),
  otherExpense: money.default(0),
  durationMinutes: z.number().int().nonnegative().nullable().default(null),
  startingOdometer: z.number().nonnegative().nullable().default(null),
  endingOdometer: z.number().nonnegative().nullable().default(null),
  zone: z.string().optional(),
  notes: z.string().optional(),
  dedupeKey: z.string().optional(),
});
export type DeliverySessionForm = z.infer<typeof deliverySessionSchema>;

export const calendarEventSchema = z
  .object({
    title: z.string().min(1),
    category: z.enum([
      'trabajo', 'almuerzo', 'gimnasio', 'delivery',
      'descanso', 'personal', 'cita', 'proyecto', 'otro',
    ]),
    startsAt: z.string(),
    endsAt: z.string(),
    location: z.string().optional(),
    remindersEnabled: z.boolean().default(false),
  })
  .refine((v) => new Date(v.endsAt) >= new Date(v.startsAt), {
    message: 'La hora de fin debe ser posterior al inicio',
    path: ['endsAt'],
  });
export type CalendarEventForm = z.infer<typeof calendarEventSchema>;

export const goalSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    'ganancias', 'horas', 'millas', 'promedio_hora', 'promedio_milla',
    'sesiones', 'entrenamientos', 'descanso', 'dias_libres', 'ahorro', 'gastos_max',
  ]),
  period: z.enum(['diaria', 'semanal', 'mensual', 'personalizada']),
  targetValue: z.number().positive(),
  unit: z.string().optional(),
});
export type GoalForm = z.infer<typeof goalSchema>;

export const scheduleExtractionSchema = z.object({
  rows: z.array(z.object({ date: z.string(), code: z.string() })).max(60),
});

export const scheduleConfirmSchema = z.object({
  importId: z.string().uuid().optional(),
  events: z
    .array(
      z.object({
        title: z.string().min(1),
        category: z.enum([
          'trabajo', 'almuerzo', 'gimnasio', 'delivery', 'descanso', 'personal', 'cita', 'proyecto', 'otro',
        ]),
        startsAt: z.string(),
        endsAt: z.string(),
      }),
    )
    .max(120),
});
