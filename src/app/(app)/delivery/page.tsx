import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { weekRange } from '@/lib/domain/week';
import { aggregateSessions, type StoredSession } from '@/lib/domain/stats';
import { QuickDeliveryForm } from '@/components/quick-delivery-form';
import { DeliveryStats } from '@/components/delivery-stats';
import { SessionList, type SessionRow } from '@/components/session-list';

const TZ = 'America/New_York';

function ymd(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

export default async function DeliveryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const week = weekRange(new Date(), TZ);
  const { data } = await supabase
    .from('delivery_sessions')
    .select('id,work_date,gross_income,net_income,duration_minutes,total_miles,zone,status')
    .gte('work_date', ymd(week.start))
    .lt('work_date', ymd(week.end))
    .order('work_date', { ascending: false });

  const rows = (data ?? []) as SessionRow[];

  const normalized: StoredSession[] = rows.map((s) => ({
    workDate: s.work_date,
    grossCents: Math.round(Number(s.gross_income ?? 0) * 100),
    netCents: Math.round(Number(s.net_income ?? 0) * 100),
    minutes: Number(s.duration_minutes ?? 0),
    miles: Number(s.total_miles ?? 0),
    zone: s.zone,
  }));
  const stats = aggregateSessions(normalized);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>Esta semana (desde el domingo).</p>
      </header>

      <QuickDeliveryForm />

      <section aria-labelledby="stats">
        <h2 id="stats" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>Estadísticas</h2>
        <DeliveryStats stats={stats} />
      </section>

      <section aria-labelledby="ses">
        <h2 id="ses" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>Sesiones</h2>
        <SessionList sessions={rows} />
      </section>
    </div>
  );
}
