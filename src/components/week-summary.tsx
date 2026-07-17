import { MetricCard } from './metric-card';
import { formatUSD } from '@/lib/domain/money';

export interface WeekTotals {
  grossCents: number;
  netCents: number;
  minutes: number;
  miles: number;
  sessions: number;
  hourlyCents: number | null;
  perMileCents: number | null;
}

export function WeekSummary({ totals }: { totals: WeekTotals }) {
  const hours = (totals.minutes / 60).toFixed(1);
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetricCard label="Ganancia (bruto)" value={formatUSD(totals.grossCents)} />
      <MetricCard label="Ganancia neta" value={formatUSD(totals.netCents)} />
      <MetricCard label="Horas de delivery" value={`${hours} h`} hint={`${totals.sessions} sesiones`} />
      <MetricCard label="Millas" value={totals.miles.toFixed(1)} />
      <MetricCard
        label="Por hora"
        value={totals.hourlyCents == null ? '—' : formatUSD(totals.hourlyCents)}
      />
      <MetricCard
        label="Por milla"
        value={totals.perMileCents == null ? '—' : formatUSD(totals.perMileCents)}
      />
    </div>
  );
}
