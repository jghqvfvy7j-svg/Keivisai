import { MetricCard } from './metric-card';
import { formatUSD } from '@/lib/domain/money';
import type { PeriodStats } from '@/lib/domain/stats';

function dayLabel(d: string) {
  return new Intl.DateTimeFormat('es-US', {
    timeZone: 'America/New_York', weekday: 'long', day: 'numeric', month: 'short',
  }).format(new Date(`${d}T12:00:00`));
}

export function DeliveryStats({ stats }: { stats: PeriodStats }) {
  const hours = (stats.minutes / 60).toFixed(1);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Bruto (semana)" value={formatUSD(stats.grossCents)} hint={`${stats.sessions} sesiones`} />
        <MetricCard label="Neto (semana)" value={formatUSD(stats.netCents)} />
        <MetricCard label="Horas" value={`${hours} h`} />
        <MetricCard label="Millas" value={stats.miles.toFixed(1)} />
        <MetricCard label="Por hora" value={stats.hourlyCents == null ? '—' : formatUSD(stats.hourlyCents)} />
        <MetricCard label="Por milla" value={stats.perMileCents == null ? '—' : formatUSD(stats.perMileCents)} />
      </div>
      {(stats.bestDay || stats.bestZone) && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgb(var(--surface))' }}>
          {stats.bestDay ? (
            <div className="flex justify-between">
              <span style={{ color: 'rgb(var(--muted))' }}>Mejor día</span>
              <span className="font-medium capitalize">{dayLabel(stats.bestDay.date)} · {formatUSD(stats.bestDay.grossCents)}</span>
            </div>
          ) : null}
          {stats.bestZone ? (
            <div className="mt-1 flex justify-between">
              <span style={{ color: 'rgb(var(--muted))' }}>Mejor zona</span>
              <span className="font-medium">{stats.bestZone.zone} · {formatUSD(stats.bestZone.grossCents)}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
