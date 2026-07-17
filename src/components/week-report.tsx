import { BarChart } from './bar-chart';
import { formatUSD } from '@/lib/domain/money';
import { percentChange } from '@/lib/domain/compare';

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function WeekReport({
  dailyGrossCents,
  currentTotalCents,
  prevTotalCents,
}: {
  dailyGrossCents: number[]; // 7 valores, domingo..sábado
  currentTotalCents: number;
  prevTotalCents: number;
}) {
  const change = percentChange(prevTotalCents, currentTotalCents);
  const up = change != null && change >= 0;
  const color = change == null ? '--cat-rest' : up ? '--cat-gym' : '--cat-delivery';
  const changeText =
    change == null ? 'sin dato previo' : `${up ? '▲' : '▼'} ${Math.abs(change)}% vs. semana anterior`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'rgb(var(--muted))' }}>
          Semana anterior: {formatUSD(prevTotalCents)}
        </span>
        <span className="font-medium" style={{ color: `rgb(var(${color}))` }}>{changeText}</span>
      </div>
      <BarChart data={DAYS.map((d, i) => ({ label: d, value: (dailyGrossCents[i] ?? 0) / 100 }))} />
    </div>
  );
}
