import type { MuscleGroup, Equipment, Difficulty, Goal, ExerciseType } from "@/lib/types/database";

export const muscleLabels: Record<MuscleGroup, string> = {
  pecho: "Chest",
  espalda: "Back",
  piernas: "Legs",
  gluteos: "Glutes",
  hombros: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abdomen: "Core",
  cardio: "Cardio",
  full_body: "Full body",
};

export const equipmentLabels: Record<Equipment, string> = {
  gimnasio_completo: "Full gym",
  mancuernas: "Dumbbells",
  barras: "Barbell",
  maquinas: "Machines",
  peso_corporal: "Bodyweight",
  bandas: "Bands",
  casa: "Home",
};

export const difficultyLabels: Record<Difficulty, string> = {
  principiante: "Beginner",
  intermedio: "Intermediate",
  avanzado: "Advanced",
};

export const goalLabels: Record<Goal, string> = {
  ganar_masa_muscular: "Build muscle",
  perder_grasa: "Lose fat",
  tonificar: "Tone up",
  aumentar_fuerza: "Get stronger",
  mejorar_salud: "General health",
  recomposicion: "Body recomposition",
};

export const exerciseTypeLabels: Record<ExerciseType, string> = {
  fuerza: "Strength",
  hipertrofia: "Hypertrophy",
  cardio: "Cardio",
  movilidad: "Mobility",
  peso_corporal: "Bodyweight",
};

// Force and mechanic come from the exercise DB and may be stored in Spanish.
// These maps normalize them to English for display.
export function forceLabel(force?: string | null): string {
  if (!force) return "";
  const f = force.toLowerCase();
  if (f === "empuje" || f === "push") return "Push";
  if (f === "tirón" || f === "tiron" || f === "pull") return "Pull";
  if (f === "estático" || f === "estatico" || f === "static") return "Static";
  return force;
}

export function mechanicLabel(mechanic?: string | null): string {
  if (!mechanic) return "";
  const m = mechanic.toLowerCase();
  if (m === "compuesto" || m === "compound") return "Compound";
  if (m === "aislamiento" || m === "isolation") return "Isolation";
  return mechanic;
}

// A short English description from force + mechanic, e.g. "A compound push exercise."
export function exerciseSubtitle(force?: string | null, mechanic?: string | null): string {
  const f = forceLabel(force).toLowerCase();
  const m = mechanicLabel(mechanic).toLowerCase();
  if (!f && !m) return "";
  const article = m === "isolation" ? "An" : "A";
  const mech = m || "compound";
  const frc = f ? ` ${f}` : "";
  return `${article} ${mech}${frc} exercise.`;
}
