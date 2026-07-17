/** Metadatos de UI por tipo de meta (compartidos entre formulario y página). */
export type GoalType =
  | 'ganancias' | 'horas' | 'millas' | 'promedio_hora' | 'promedio_milla'
  | 'sesiones' | 'entrenamientos' | 'descanso' | 'dias_libres' | 'ahorro' | 'gastos_max';

export type GoalFormat = 'money' | 'hours' | 'miles' | 'count';
export type GoalDir = 'min' | 'max';

export interface GoalTypeMeta {
  label: string;
  unit: string;
  format: GoalFormat;
  direction: GoalDir;
  /** ¿Se puede calcular el valor actual con los datos de delivery/gimnasio? */
  computable: boolean;
}

export const GOAL_TYPES: Record<GoalType, GoalTypeMeta> = {
  ganancias:      { label: 'Ganancias',            unit: 'USD',    format: 'money', direction: 'min', computable: true },
  horas:          { label: 'Horas de delivery',    unit: 'horas',  format: 'hours', direction: 'min', computable: true },
  millas:         { label: 'Millas (techo)',       unit: 'millas', format: 'miles', direction: 'max', computable: true },
  promedio_hora:  { label: 'Promedio por hora',     unit: 'USD/h',  format: 'money', direction: 'min', computable: true },
  promedio_milla: { label: 'Promedio por milla',    unit: 'USD/mi', format: 'money', direction: 'min', computable: true },
  sesiones:       { label: 'Sesiones',             unit: 'sesiones', format: 'count', direction: 'min', computable: true },
  entrenamientos: { label: 'Entrenamientos',       unit: 'sesiones', format: 'count', direction: 'min', computable: true },
  ahorro:         { label: 'Ahorro (neto)',        unit: 'USD',    format: 'money', direction: 'min', computable: true },
  gastos_max:     { label: 'Gastos máximos (techo)', unit: 'USD',  format: 'money', direction: 'max', computable: true },
  descanso:       { label: 'Horas de descanso',    unit: 'horas',  format: 'hours', direction: 'min', computable: false },
  dias_libres:    { label: 'Días libres',          unit: 'días',   format: 'count', direction: 'min', computable: false },
};

export function formatGoalValue(v: number, format: GoalFormat): string {
  switch (format) {
    case 'money': return `$${v.toFixed(2)}`;
    case 'hours': return `${v.toFixed(1)} h`;
    case 'miles': return `${v.toFixed(1)} mi`;
    case 'count': return `${Math.round(v)}`;
  }
}
