/** Lógica de progreso de metas (pura y testeable). */

export type GoalDirection = 'min' | 'max';
export type GoalStatus = 'en_camino' | 'atrasado' | 'completado' | 'excedido';

export interface GoalProgressInput {
  target: number;
  current: number;
  /** Fracción del periodo transcurrida (0..1). Para el cálculo de ritmo. */
  elapsedFraction: number;
  /** 'min' = alcanzar al menos el objetivo (por defecto). 'max' = techo/presupuesto. */
  direction?: GoalDirection;
}

export interface GoalProgressResult {
  percentage: number; // 0..(>1). current/target
  remaining: number; // min: lo que falta (>=0). max: presupuesto restante (puede ser negativo)
  status: GoalStatus;
  onPace: boolean;
}

function clampFraction(f: number): number {
  if (!Number.isFinite(f)) return 0;
  return Math.min(1, Math.max(0, f));
}

export function computeGoalProgress(input: GoalProgressInput): GoalProgressResult {
  const direction = input.direction ?? 'min';
  const target = input.target;
  const current = Math.max(0, input.current);
  const elapsed = clampFraction(input.elapsedFraction);

  const percentage = target > 0 ? current / target : current > 0 ? 1 : 0;

  if (direction === 'max') {
    // Meta techo (gastos máximos, millas máximas): quedarse por debajo es bueno.
    const remaining = target - current;
    const status: GoalStatus = current > target ? 'excedido' : 'en_camino';
    return { percentage, remaining, status, onPace: current <= target };
  }

  // Meta 'min': alcanzar al menos el objetivo.
  const remaining = Math.max(0, target - current);
  let status: GoalStatus;
  let onPace: boolean;

  if (target <= 0) {
    status = 'completado';
    onPace = true;
  } else if (current > target) {
    status = 'excedido';
    onPace = true;
  } else if (current === target) {
    status = 'completado';
    onPace = true;
  } else {
    const expectedByNow = elapsed * target;
    onPace = current >= expectedByNow;
    status = onPace ? 'en_camino' : 'atrasado';
  }

  return { percentage, remaining, status, onPace };
}

/** Etiqueta legible en español para el estado. */
export function goalStatusLabel(s: GoalStatus): string {
  switch (s) {
    case 'en_camino':
      return 'En camino';
    case 'atrasado':
      return 'Atrasado';
    case 'completado':
      return 'Completado';
    case 'excedido':
      return 'Excedido';
  }
}
