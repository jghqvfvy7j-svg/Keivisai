import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { dayRange, weekRange } from '@/lib/domain/week';
import { perHourCents, perMileCents } from '@/lib/domain/money';
import { Icon } from '@/components/icon';
import { TodayTimeline } from '@/components/today-timeline';
import { WeekSummary, type WeekTotals } from '@/components/week-summary';
import { WeekReport } from '@/components/week-report';
import type { CalendarEvent } from '@/lib/domain/types';

const TZ = 'America/New_York';

function ymd(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d); // YYYY-MM-DD
}

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(
      new Date(),
    ),
  );
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();
  const day = dayRange(now, TZ);
  const week = weekRange(now, TZ);

  const { data: rawEvents } = await supabase
    .from('calendar_events')
    .select('id,title,category,starts_at,ends_at')
    .is('deleted_at', null)
    .gte('starts_at', day.start.toISOString())
    .lt('starts_at', day.end.toISOString())
    .order('starts_at');

  const events: CalendarEvent[] = (rawEvents ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
  }));

  const { data: sessions } = await supabase
    .from('delivery_sessions')
    .select('work_date,gross_income,net_income,duration_minutes,total_miles')
    .gte('work_date', ymd(week.start))
    .lt('work_date', ymd(week.end));

  const c = (v: unknown) => Math.round(Number(v ?? 0) * 100);
  const totals: WeekTotals = (sessions ?? []).reduce<WeekTotals>(
    (acc, s) => {
      acc.grossCents += c(s.gross_income);
      acc.netCents += c(s.net_income);
      acc.minutes += Number(s.duration_minutes ?? 0);
      acc.miles += Number(s.total_miles ?? 0);
      acc.sessions += 1;
      return acc;
    },
    { grossCents: 0, netCents: 0, minutes: 0, miles: 0, sessions: 0, hourlyCents: null, perMileCents: null },
  );
  totals.hourlyCents = perHourCents(totals.grossCents, totals.minutes);
  totals.perMileCents = perMileCents(totals.grossCents, totals.miles);

  // Reporte: buckets diarios (dom..sáb) y comparación con la semana anterior
  const dailyGrossCents = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions ?? []) {
    const idx = new Date((s as { work_date?: string }).work_date ?? '').getUTCDay();
    if (idx >= 0 && idx <= 6) dailyGrossCents[idx] += Math.round(Number((s as { gross_income?: unknown }).gross_income ?? 0) * 100);
  }
  const prevWeekStart = new Date(week.start);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
  const { data: prevSessions } = await supabase
    .from('delivery_sessions')
    .select('gross_income')
    .gte('work_date', ymd(prevWeekStart))
    .lt('work_date', ymd(week.start));
  const prevTotalCents = (prevSessions ?? []).reduce(
    (acc, s) => acc + Math.round(Number((s as { gross_income?: unknown }).gross_income ?? 0) * 100),
    0,
  );

  const { count: pendingEmails } = await supabase
    .from('email_summaries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('requires_attention', true)
    .is('user_feedback', null);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Keivis</h1>
          <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
            Esto es lo que tienes hoy.
          </p>
        </div>
        <div className="mt-1 flex flex-col items-end gap-1">
          <a href="/instalar" className="text-xs" style={{ color: 'rgb(var(--cat-work))' }}>Instalar app</a>
          <a href="/ajustes" className="text-xs" style={{ color: 'rgb(var(--cat-work))' }}>Ajustes</a>
        </div>
      </header>

      {pendingEmails ? (
        <a href="/correos" className="card flex items-center gap-3 text-sm" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <Icon name="mail" size={18} style={{ color: 'rgb(var(--accent))' }} />
          <span><span className="tabnum font-medium">{pendingEmails}</span> correo(s) importante(s) pendiente(s)</span>
          <Icon name="chevronRight" size={16} className="ml-auto" style={{ color: 'rgb(var(--muted))' }} />
        </a>
      ) : null}

      <section aria-labelledby="hoy">
        <h2 id="hoy" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>
          Hoy
        </h2>
        <TodayTimeline events={events} />
      </section>

      <section aria-labelledby="semana">
        <h2 id="semana" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>
          Resumen semanal
        </h2>
        <WeekSummary totals={totals} />
        <div className="mt-3">
          <WeekReport dailyGrossCents={dailyGrossCents} currentTotalCents={totals.grossCents} prevTotalCents={prevTotalCents} />
        </div>
      </section>
    </div>
  );
}
