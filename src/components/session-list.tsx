import { formatUSD, perHourCents, perMileCents } from '@/lib/domain/money';

export interface SessionRow {
  id: string;
  work_date: string;
  gross_income: number | string | null;
  net_income: number | string | null;
  duration_minutes: number | null;
  total_miles: number | string | null;
  zone: string | null;
  status: string;
}

function dayLabel(d: string) {
  return new Intl.DateTimeFormat('es-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${d}T12:00:00`));
}

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
        Aún no hay sesiones registradas esta semana.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {sessions.map((s) => {
        const gross = Math.round(Number(s.gross_income ?? 0) * 100);
        const miles = Number(s.total_miles ?? 0);
        const hr = perHourCents(gross, s.duration_minutes);
        const mi = perMileCents(gross, miles);
        return (
          <li key={s.id} className="rounded-2xl p-3" style={{ background: 'rgb(var(--surface))' }}>
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{dayLabel(s.work_date)}</span>
              <span className="font-semibold">{formatUSD(gross)}</span>
            </div>
            <div className="mt-0.5 text-xs" style={{ color: 'rgb(var(--muted))' }}>
              {hr == null ? '—' : `${formatUSD(hr)}/h`} · {mi == null ? '—' : `${formatUSD(mi)}/mi`}
              {s.zone ? ` · ${s.zone}` : ''}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
