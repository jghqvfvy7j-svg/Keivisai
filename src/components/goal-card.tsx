'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeGoalProgress, goalStatusLabel } from '@/lib/domain/goals';
import { formatGoalValue, type GoalFormat, type GoalDir } from '@/lib/goal-config';

const statusColor: Record<string, string> = {
  en_camino: '--cat-work',
  atrasado: '--cat-delivery',
  completado: '--cat-gym',
  excedido: '--cat-goal',
};

export interface GoalCardProps {
  id: string;
  name: string;
  target: number;
  current: number | null; // dólares/horas/millas/conteo según format, o null si no medible
  format: GoalFormat;
  direction: GoalDir;
  elapsedFraction: number;
  periodLabel: string;
}

export function GoalCard(props: GoalCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`¿Eliminar la meta "${props.name}"?`)) return;
    setBusy(true);
    await fetch(`/api/goals/${props.id}`, { method: 'DELETE' });
    router.refresh();
  }

  const computable = props.current != null;
  const progress = computable
    ? computeGoalProgress({
        target: props.target,
        current: props.current as number,
        elapsedFraction: props.elapsedFraction,
        direction: props.direction,
      })
    : null;

  const pct = progress ? Math.min(1, Math.max(0, progress.percentage)) : 0;
  const color = progress ? statusColor[progress.status] : '--cat-rest';

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--surface))' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{props.name}</div>
          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{props.periodLabel}</div>
        </div>
        <button onClick={remove} disabled={busy} aria-label="Eliminar meta"
          className="text-sm" style={{ color: 'rgb(var(--muted))' }}>✕</button>
      </div>

      {computable && progress ? (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgb(var(--border))' }}>
            <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: `rgb(var(${color}))` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>
              {formatGoalValue(props.current as number, props.format)}
              <span style={{ color: 'rgb(var(--muted))' }}> / {formatGoalValue(props.target, props.format)}</span>
            </span>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ color: `rgb(var(${color}))`, background: `rgb(var(${color}) / 0.12)` }}>
              {goalStatusLabel(progress.status)}
            </span>
          </div>
          <div className="mt-1 text-xs" style={{ color: 'rgb(var(--muted))' }}>
            {props.direction === 'max'
              ? `Presupuesto restante: ${formatGoalValue(progress.remaining, props.format)}`
              : `Falta: ${formatGoalValue(progress.remaining, props.format)}`}
          </div>
        </>
      ) : (
        <div className="mt-3 text-sm" style={{ color: 'rgb(var(--muted))' }}>
          Objetivo: {formatGoalValue(props.target, props.format)} · seguimiento manual (aún no medible automáticamente)
        </div>
      )}
    </div>
  );
}
