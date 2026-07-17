import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { dayRange, monthRange, weekRange } from '@/lib/domain/week';
import { aggregateSessions, type StoredSession } from '@/lib/domain/stats';
import { computeGoalProgress } from '@/lib/domain/goals';
import { elapsedFraction } from '@/lib/domain/compare';
import { GOAL_TYPES, type GoalType } from '@/lib/goal-config';
import { detectConflicts, detectDuplicateEvents, detectIncompleteSessions } from './detect';

const TZ = 'America/New_York';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export interface AutomationSummary {
  incompleteSessions: number;
  duplicateGroups: number;
  conflicts: number;
  goalsRecalculated: number;
}

/**
 * Ejecuta las automatizaciones silenciosas para un usuario y registra el run.
 * No envía notificaciones (sólo escribe en la BD).
 */
export async function runAutomationsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<AutomationSummary> {
  const startedAt = new Date().toISOString();
  const now = new Date();
  const week = weekRange(now, TZ);
  const month = monthRange(now, TZ);
  const rangeStart = week.start < month.start ? week.start : month.start;
  const rangeEnd = week.end > month.end ? week.end : month.end;

  // --- Datos ---
  const [{ data: sessData }, { data: eventData }, { data: goalsData }, { data: workoutsData }] =
    await Promise.all([
      admin.from('delivery_sessions')
        .select('id,work_date,gross_income,net_income,duration_minutes,total_miles,zone,status')
        .eq('user_id', userId).gte('work_date', ymd(rangeStart)).lt('work_date', ymd(rangeEnd)),
      admin.from('calendar_events')
        .select('id,title,starts_at,ends_at,blocks_time,dedupe_key,category')
        .eq('user_id', userId).is('deleted_at', null)
        .gte('starts_at', week.start.toISOString()).lt('starts_at', rangeEnd.toISOString()),
      admin.from('goals').select('id,type,period,target_value').eq('user_id', userId).eq('status', 'activa'),
      admin.from('workout_sessions').select('planned_start,status')
        .eq('user_id', userId).gte('planned_start', rangeStart.toISOString()).lt('planned_start', rangeEnd.toISOString()),
    ]);

  const sessions = sessData ?? [];
  const events = (eventData ?? []).map((e) => ({
    id: e.id, title: e.title, startsAt: e.starts_at, endsAt: e.ends_at,
    blocksTime: e.blocks_time, dedupeKey: e.dedupe_key, category: e.category,
  }));

  // --- Detecciones ---
  const incomplete = detectIncompleteSessions(
    sessions.map((s) => ({ id: s.id, status: s.status, durationMinutes: s.duration_minutes, totalMiles: Number(s.total_miles ?? 0) || null })),
  );
  const duplicates = detectDuplicateEvents(events);
  const conflicts = detectConflicts(events);

  // --- Recalcular progreso de metas ---
  const workouts = workoutsData ?? [];
  const aggInRange = (s: Date, e: Date) => {
    const rows: StoredSession[] = sessions
      .filter((x) => x.work_date >= ymd(s) && x.work_date < ymd(e))
      .map((x) => ({
        workDate: x.work_date,
        grossCents: Math.round(Number(x.gross_income ?? 0) * 100),
        netCents: Math.round(Number(x.net_income ?? 0) * 100),
        minutes: Number(x.duration_minutes ?? 0),
        miles: Number(x.total_miles ?? 0),
        zone: x.zone,
      }));
    return aggregateSessions(rows);
  };
  const workoutsInRange = (s: Date, e: Date) =>
    workouts.filter((w) => w.status === 'completada' && w.planned_start >= s.toISOString() && w.planned_start < e.toISOString()).length;

  const rangeFor = (period: string) =>
    period === 'diaria' ? dayRange(now, TZ) : period === 'mensual' ? monthRange(now, TZ) : weekRange(now, TZ);

  const currentValue = (type: GoalType, s: Date, e: Date): number | null => {
    if (!GOAL_TYPES[type]?.computable) return null;
    const a = aggInRange(s, e);
    switch (type) {
      case 'ganancias': return a.grossCents / 100;
      case 'ahorro': return a.netCents / 100;
      case 'horas': return a.minutes / 60;
      case 'millas': return a.miles;
      case 'sesiones': return a.sessions;
      case 'entrenamientos': return workoutsInRange(s, e);
      case 'promedio_hora': return (a.hourlyCents ?? 0) / 100;
      case 'promedio_milla': return (a.perMileCents ?? 0) / 100;
      case 'gastos_max': return (a.grossCents - a.netCents) / 100;
      default: return null;
    }
  };

  let goalsRecalculated = 0;
  for (const g of goalsData ?? []) {
    const type = g.type as GoalType;
    const meta = GOAL_TYPES[type];
    const r = rangeFor(g.period);
    const current = currentValue(type, r.start, r.end);
    if (current == null || !meta) continue;
    const progress = computeGoalProgress({
      target: Number(g.target_value),
      current,
      elapsedFraction: elapsedFraction(r.start, r.end, now),
      direction: meta.direction,
    });
    await admin.from('goal_progress').upsert(
      {
        user_id: userId,
        goal_id: g.id,
        period_start: ymd(r.start),
        period_end: ymd(r.end),
        current_value: current,
        percentage: Math.round(progress.percentage * 10000) / 100,
        status: progress.status,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: 'goal_id,period_start,period_end' },
    );
    goalsRecalculated++;
  }

  const summary: AutomationSummary = {
    incompleteSessions: incomplete.length,
    duplicateGroups: duplicates.length,
    conflicts: conflicts.length,
    goalsRecalculated,
  };

  await admin.from('automation_runs').insert({
    user_id: userId,
    automation_type: 'scheduled',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    status: 'ok',
    result: summary as object,
  });

  return summary;
}
