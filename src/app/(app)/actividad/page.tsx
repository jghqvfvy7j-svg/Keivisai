import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RunNowButton } from '@/components/run-now-button';

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-US', { timeZone: 'America/New_York', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '';

export default async function ActividadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: runs }, { data: logs }] = await Promise.all([
    supabase.from('automation_runs').select('automation_type,started_at,status,result').eq('user_id', user.id).order('started_at', { ascending: false }).limit(15),
    supabase.from('audit_logs').select('action,actor_type,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Centro de actividad</h1>
          <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>Automatizaciones y cambios recientes.</p>
        </div>
        <RunNowButton />
      </header>

      <section aria-labelledby="auto">
        <h2 id="auto" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>Automatizaciones</h2>
        {(runs ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>Aún no se han ejecutado.</p>
        ) : (
          <ul className="space-y-2">
            {(runs ?? []).map((r, i) => {
              const res = (r.result ?? {}) as Record<string, number>;
              return (
                <li key={i} className="rounded-2xl p-3 text-sm" style={{ background: 'rgb(var(--surface))' }}>
                  <div className="flex justify-between">
                    <span className="font-medium">{r.automation_type}</span>
                    <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{fmt(r.started_at)}</span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'rgb(var(--muted))' }}>
                    {res.goalsRecalculated ?? 0} metas · {res.incompleteSessions ?? 0} incompletas · {res.duplicateGroups ?? 0} duplicados · {res.conflicts ?? 0} conflictos
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="acc">
        <h2 id="acc" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>Acciones</h2>
        {(logs ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>Sin cambios registrados.</p>
        ) : (
          <ul className="space-y-2">
            {(logs ?? []).map((l, i) => (
              <li key={i} className="flex justify-between rounded-2xl p-3 text-sm" style={{ background: 'rgb(var(--surface))' }}>
                <span>{l.action} <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>({l.actor_type})</span></span>
                <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{fmt(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
