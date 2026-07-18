// Hand-authored to mirror supabase/schema.sql.
// When the project is connected to a real Supabase instance, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Goal =
  | "ganar_masa_muscular"
  | "perder_grasa"
  | "tonificar"
  | "aumentar_fuerza"
  | "mejorar_salud"
  | "recomposicion";

export type Level = "principiante" | "intermedio" | "avanzado";

export type Equipment =
  | "gimnasio_completo"
  | "mancuernas"
  | "barras"
  | "maquinas"
  | "peso_corporal"
  | "bandas"
  | "casa";

export type MuscleGroup =
  | "pecho"
  | "espalda"
  | "piernas"
  | "gluteos"
  | "hombros"
  | "biceps"
  | "triceps"
  | "abdomen"
  | "cardio"
  | "full_body";

export type ExerciseType = "fuerza" | "hipertrofia" | "cardio" | "movilidad" | "peso_corporal";
export type Difficulty = "principiante" | "intermedio" | "avanzado";
export type RoutineGoal =
  | "full_body"
  | "push_pull_legs"
  | "torso_pierna"
  | "hipertrofia"
  | "fuerza"
  | "perdida_grasa"
  | "principiante"
  | "intermedio"
  | "avanzado";

export interface UserProfileRow {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: "masculino" | "femenino" | "otro" | "prefiero_no_decir" | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  goal: Goal;
  level: Level;
  training_days: number;
  session_duration_minutes: number;
  injuries: string | null;
  equipment_available: Equipment[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  instructions: string[];
  main_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  type: ExerciseType;
  image_url: string | null;
  images: string[];
  force: string | null;
  mechanic: string | null;
  common_mistakes: string[];
  tips: string[];
  recommended_sets: number;
  recommended_reps: string;
  recommended_rest_seconds: number;
  alternatives: string[];
  created_at: string;
}

export interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  goal: RoutineGoal;
  days_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineDayRow {
  id: string;
  routine_id: string;
  day_name: string;
  day_order: number;
  focus: string;
}

export interface RoutineExerciseRow {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  sets: number;
  reps: string;
  suggested_weight_kg: number | null;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
}

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  total_volume_kg: number | null;
  total_sets: number | null;
  total_reps: number | null;
  notes: string | null;
}

export interface WorkoutLogRow {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
}

export interface BodyMetricRow {
  id: string;
  user_id: string;
  weight_kg: number | null;
  height_cm: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  leg_cm: number | null;
  hip_cm: number | null;
  progress_photo_url: string | null;
  notes: string | null;
  recorded_at: string;
}

export interface NutritionLogRow {
  id: string;
  user_id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  water_ml: number | null;
  notes: string | null;
  logged_at: string;
}

export interface FavoriteExerciseRow {
  id: string;
  user_id: string;
  exercise_id: string;
  created_at: string;
}

export interface RecommendationRow {
  id: string;
  user_id: string;
  type: string;
  message: string;
  related_exercise_id: string | null;
  is_read: boolean;
  created_at: string;
}

// Minimal Database shape so @supabase/ssr generics compile cleanly.
// Extend with Insert/Update per-table as forms are wired to real data.
export interface Database {
  public: {
    Tables: {
      users_profiles: { Row: UserProfileRow; Insert: Partial<UserProfileRow>; Update: Partial<UserProfileRow> };
      exercises: { Row: ExerciseRow; Insert: Partial<ExerciseRow>; Update: Partial<ExerciseRow> };
      routines: { Row: RoutineRow; Insert: Partial<RoutineRow>; Update: Partial<RoutineRow> };
      routine_days: { Row: RoutineDayRow; Insert: Partial<RoutineDayRow>; Update: Partial<RoutineDayRow> };
      routine_exercises: { Row: RoutineExerciseRow; Insert: Partial<RoutineExerciseRow>; Update: Partial<RoutineExerciseRow> };
      workout_sessions: { Row: WorkoutSessionRow; Insert: Partial<WorkoutSessionRow>; Update: Partial<WorkoutSessionRow> };
      workout_logs: { Row: WorkoutLogRow; Insert: Partial<WorkoutLogRow>; Update: Partial<WorkoutLogRow> };
      body_metrics: { Row: BodyMetricRow; Insert: Partial<BodyMetricRow>; Update: Partial<BodyMetricRow> };
      nutrition_logs: { Row: NutritionLogRow; Insert: Partial<NutritionLogRow>; Update: Partial<NutritionLogRow> };
      favorite_exercises: { Row: FavoriteExerciseRow; Insert: Partial<FavoriteExerciseRow>; Update: Partial<FavoriteExerciseRow> };
      recommendations: { Row: RecommendationRow; Insert: Partial<RecommendationRow>; Update: Partial<RecommendationRow> };
    };
  };
}
