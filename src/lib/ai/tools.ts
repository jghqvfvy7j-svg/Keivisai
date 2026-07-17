import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { SupabaseClient } from '@supabase/supabase-js';
import { dayRange, weekRange } from '@/lib/domain/week';
import { aggregateSessions, type StoredSession } from '@/lib/domain/stats';
import { formatUSD } from '@/lib/domain/money';

const TZ = 'America/New_York';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Contexto que el servidor inyecta. El user_id SIEMPRE viene de la sesión. */
export interface ToolContext {
  userId: string;
  supabase: SupabaseClient;
}

/** Nivel de confirmación requerido (spec §19). */
export type Risk = 'none' | 'recommended' | 'required';

export interface ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  schema: S;
  risk: Risk;
  handler: (ctx: ToolContext, args: z.infer<S>) => Promise<unknown>;
}

function def<S extends z.ZodTypeAny>(d: ToolDef<S>): ToolDef {
  return d as unknown as ToolDef;
}

// ---------------------------------------------------------------------------
// Definiciones de herramientas
// ---------------------------------------------------------------------------
export const TOOLS: ToolDef[] = [
  def({
    name: 'get_today_schedule',
    description: 'Devuelve los eventos de hoy (trabajo, almuerzo, gimnasio, delivery, etc.).',
    schema: z.object({}),
    risk: 'none',
    async handler(ctx) {
      const { start, end } = dayRange(new Date(), TZ);
      const { data } = await ctx.supabase
        .from('calendar_events')
        .select('title,category,starts_at,ends_at')
        .eq('user_id', ctx.userId)
        .is('deleted_at', null)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at');
      return { events: data ?? [] };
    },
  }),

  def({
    name: 'get_week_delivery_summary',
    description: 'Resumen de delivery de la semana actual (bruto, neto, horas, millas, $/h, $/milla).',
    schema: z.object({}),
    risk: 'none',
    async handler(ctx) {
      const { start, end } = weekRange(new Date(), TZ);
      const { data } = await ctx.supabase
        .from('delivery_sessions')
        .select('work_date,gross_income,net_income,duration_minutes,total_miles,zone')
        .eq('user_id', ctx.userId)
        .gte('work_date', ymd(start))
        .lt('work_date', ymd(end));
      const rows: StoredSession[] = (data ?? []).map((s) => ({
        workDate: s.work_date,
        grossCents: Math.round(Number(s.gross_income ?? 0) * 100),
        netCents: Math.round(Number(s.net_income ?? 0) * 100),
        minutes: Number(s.duration_minutes ?? 0),
        miles: Number(s.total_miles ?? 0),
        zone: s.zone,
      }));
      const a = aggregateSessions(rows);
      return {
        sessions: a.sessions,
        bruto: formatUSD(a.grossCents),
        neto: formatUSD(a.netCents),
        horas: (a.minutes / 60).toFixed(1),
        millas: a.miles,
        por_hora: a.hourlyCents == null ? null : formatUSD(a.hourlyCents),
        por_milla: a.perMileCents == null ? null : formatUSD(a.perMileCents),
        mejor_dia: a.bestDay,
        mejor_zona: a.bestZone,
      };
    },
  }),

  def({
    name: 'get_active_goals',
    description: 'Lista las metas activas con su objetivo.',
    schema: z.object({}),
    risk: 'none',
    async handler(ctx) {
      const { data } = await ctx.supabase
        .from('goals')
        .select('id,name,type,period,target_value,unit')
        .eq('user_id', ctx.userId)
        .eq('status', 'activa');
      return { goals: data ?? [] };
    },
  }),

  def({
    name: 'create_delivery_session',
    description: 'Registra una sesión de delivery ya realizada. earnings es la ganancia total.',
    schema: z.object({
      earnings: z.number().nonnegative(),
      durationMinutes: z.number().int().nonnegative().nullable().optional(),
      miles: z.number().nonnegative().nullable().optional(),
      fuelExpense: z.number().nonnegative().optional(),
      otherExpense: z.number().nonnegative().optional(),
      zone: z.string().optional(),
      workDate: z.string().optional(), // YYYY-MM-DD; por defecto hoy
    }),
    risk: 'none',
    async handler(ctx, args) {
      const { data, error } = await ctx.supabase
        .from('delivery_sessions')
        .insert({
          user_id: ctx.userId,
          platform: 'doordash',
          work_date: args.workDate ?? ymd(new Date()),
          base_pay: args.earnings,
          fuel_expense: args.fuelExpense ?? 0,
          other_expense: args.otherExpense ?? 0,
          duration_minutes: args.durationMinutes ?? null,
          starting_odometer: 0,
          ending_odometer: args.miles ?? null,
          zone: args.zone ?? null,
          status: 'terminada',
          source: 'asistente',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    },
  }),

  def({
    name: 'create_goal',
    description: 'Crea una meta.',
    schema: z.object({
      name: z.string().optional(),
      type: z.enum([
        'ganancias', 'horas', 'millas', 'promedio_hora', 'promedio_milla',
        'sesiones', 'entrenamientos', 'descanso', 'dias_libres', 'ahorro', 'gastos_max',
      ]),
      period: z.enum(['diaria', 'semanal', 'mensual']),
      targetValue: z.number().positive(),
    }),
    risk: 'none',
    async handler(ctx, args) {
      const { data, error } = await ctx.supabase
        .from('goals')
        .insert({
          user_id: ctx.userId,
          name: args.name ?? args.type,
          type: args.type,
          period: args.period,
          target_value: args.targetValue,
          status: 'activa',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    },
  }),

  def({
    name: 'create_calendar_event',
    description: 'Crea un evento en el calendario. Sin recordatorios por defecto.',
    schema: z.object({
      title: z.string().min(1),
      category: z.enum([
        'trabajo', 'almuerzo', 'gimnasio', 'delivery', 'descanso', 'personal', 'cita', 'proyecto', 'otro',
      ]),
      startsAt: z.string(), // ISO
      endsAt: z.string(), // ISO
      location: z.string().optional(),
    }),
    risk: 'none',
    async handler(ctx, args) {
      if (new Date(args.endsAt) < new Date(args.startsAt)) {
        throw new Error('endsAt debe ser posterior a startsAt');
      }
      const { data, error } = await ctx.supabase
        .from('calendar_events')
        .insert({
          user_id: ctx.userId,
          title: args.title,
          category: args.category,
          starts_at: args.startsAt,
          ends_at: args.endsAt,
          location: args.location ?? null,
          reminders_enabled: false,
          source: 'asistente',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    },
  }),

  def({
    name: 'delete_calendar_event',
    description: 'Elimina un evento del calendario por id. Acción destructiva.',
    schema: z.object({ eventId: z.string().uuid() }),
    risk: 'required',
    async handler(ctx, args) {
      const { error } = await ctx.supabase
        .from('calendar_events')
        .delete()
        .eq('id', args.eventId)
        .eq('user_id', ctx.userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  }),

  def({
    name: 'delete_delivery_session',
    description: 'Elimina una sesión de delivery por id. Acción destructiva.',
    schema: z.object({ sessionId: z.string().uuid() }),
    risk: 'required',
    async handler(ctx, args) {
      const { error } = await ctx.supabase
        .from('delivery_sessions')
        .delete()
        .eq('id', args.sessionId)
        .eq('user_id', ctx.userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  }),
];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): ToolDef | undefined {
  return BY_NAME.get(name);
}

export function riskOf(name: string): Risk | null {
  return BY_NAME.get(name)?.risk ?? null;
}

export function requiresConfirmation(name: string): boolean {
  return riskOf(name) === 'required';
}

export interface ParsedArgs {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export function validateToolArgs(name: string, args: unknown): ParsedArgs {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, error: `Herramienta desconocida: ${name}` };
  const parsed = tool.schema.safeParse(args ?? {});
  if (!parsed.success) return { ok: false, error: JSON.stringify(parsed.error.flatten()) };
  return { ok: true, data: parsed.data };
}

/** Definiciones en formato de function tools para la API de OpenAI. */
export function toolDefsForOpenAI() {
  return TOOLS.map((t) => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    parameters: zodToJsonSchema(t.schema, { target: 'openApi3' }),
  }));
}
