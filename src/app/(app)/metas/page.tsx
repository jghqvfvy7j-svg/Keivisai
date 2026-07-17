import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { dayRange, weekRange, monthRange } from '@/lib/domain/week';
import { aggregateSessions, type StoredSession } from '@/lib/domain/stats';
import { elapsedFraction } from '@/lib/domain/compare';
import { GOAL_TYPES, type GoalType } from '@/lib/goal-config';
import { GoalForm } from '@/components/goal-form';
import { GoalCard } from '@/components/goal-card';

const TZ = 'America/New_York';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

interface GoalRow {
  id: string;
  name: string;
  type: GoalType;
  period: 'diaria' | 'semanal' | 'mensual' | 'personalizada';
  target_value: number | string;
  unit: string | null;
}

function rangeFor(period: GoalRow['period'], now: Date) {
  if (period === 'diaria') return dayRange(now, TZ);
  if (period === 'mensual') return monthRange(now, TZ);
  return weekRange(now, TZ); // semanal / personalizada
}

function periodLabel(period: GoalRow['period']) {
  return period === 'diaria' ? 'Hoy' : period === 'mensual' ? 'Este mes' : 'Esta semana';
}

export default async function MetasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();
  const week = weekRange(now, TZ);
  const month = monthRange(now, TZ);
  const start = week.start < month.start ? week.start : month.start;
  const end = week.end > month.end ? week.end : month.end;

  const [{ data: goalsData }, { data: sessData }, { data: workoutsData }] = await Promise.all([
    supabase.from('goals').select('id,name,type,period,target_value,unit').eq('status', 'activa').order('created_at'),
    supabase.from('delivery_sessions')
      .select('work_date,gross_income,net_income,duration_minutes,total_miles,zone')
      .gte('work_date', ymd(start)).lt('work_date', ymd(end)),
    supabase.from('workout_sessions')
      .select('planned_start,status')
      .gte('planned_start', start.toISOString()).lt('planned_start', end.toISOString()),
  ]);

  const goals = (goalsData ?? []) as GoalRow[];
  const allSessions = (sessData ?? []) as {
    work_date: string; gross_income: number | string | null; net_income: number | string | null;
    duration_minutes: number | null; total_miles: number | string | null; zone: string | null;
  }[];
  const workouts = (workoutsData ?? []) as { planned_start: string; status: string }[];

  function aggInRange(s: Date, e: Date) {
    const rows: StoredSession[] = allSessions
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
  }

  function workoutsInRange(s: Date, e: Date) {
    return workouts.filter(
      (w) => w.status === 'completada' && w.planned_start >= s.toISOString() && w.planned_start < e.toISOString(),
    ).length;
  }

  function currentValue(type: GoalType, s: Date, e: Date): number | null {
    const meta = GOAL_TYPES[type];
    if (!meta.computable) return null;
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
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>Progreso según el periodo de cada meta.</p>
      </header>

      <GoalForm />

      {goals.length === 0 ? (
        <div className="rounded-2xl p-6 text-center text-sm" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
          Aún no tienes metas. Crea la primera arriba.
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const r = rangeFor(g.period, now);
            const meta = GOAL_TYPES[g.type];
            return (
              <GoalCard
                key={g.id}
                id={g.id}
                name={g.name}
                target={Number(g.target_value)}
                current={currentValue(g.type, r.start, r.end)}
                format={meta.format}
                direction={meta.direction}
                elapsedFraction={elapsedFraction(r.start, r.end, now)}
                periodLabel={periodLabel(g.period)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
