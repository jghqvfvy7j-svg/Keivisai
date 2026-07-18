// Personalized daily nutrition targets from the user's profile, using the
// Mifflin-St Jeor equation for BMR + activity + goal adjustment. Falls back to
// sensible defaults when profile data is missing.

export type NutritionGoal = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_ml: number;
  personalized: boolean; // false if we had to use defaults
};

type ProfileInput = {
  gender?: string | null;
  current_weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  goal?: string | null;
  level?: string | null;
  training_days?: number | null;
  // Manual targets set by the coach (or the user). If calories are present,
  // these win over the auto calculation.
  custom_calories?: number | null;
  custom_protein_g?: number | null;
  custom_carbs_g?: number | null;
  custom_fats_g?: number | null;
};

// A reasonable default when we don't have enough profile data.
const DEFAULT_GOAL: NutritionGoal = {
  calories: 2100, protein_g: 140, carbs_g: 220, fats_g: 65, water_ml: 2500,
  personalized: false,
};

export function computeNutritionGoal(profile: ProfileInput): NutritionGoal {
  // A coach-set (or user-set) target wins over the formula. We still fill any
  // macro the coach left blank from the calories, so the ring always has numbers.
  if (profile.custom_calories && profile.custom_calories > 0) {
    const calories = profile.custom_calories;
    const weight = profile.current_weight_kg ?? 0;
    const protein_g = profile.custom_protein_g ?? (weight ? Math.round(weight * 2.0) : Math.round((calories * 0.3) / 4));
    const fats_g = profile.custom_fats_g ?? Math.round((calories * 0.25) / 9);
    const carbs_g = profile.custom_carbs_g ?? Math.max(0, Math.round((calories - protein_g * 4 - fats_g * 9) / 4));
    const water_ml = weight ? Math.round((weight * 35) / 100) * 100 : 2500;
    return { calories, protein_g, carbs_g, fats_g, water_ml, personalized: true };
  }

  const weight = profile.current_weight_kg;
  const height = profile.height_cm;
  // If we lack the essentials, return the generic default.
  if (!weight || !height) return DEFAULT_GOAL;

  const age = profile.age && profile.age > 0 ? profile.age : 30; // assume 30 if unknown
  const isFemale = profile.gender === "femenino";

  // Mifflin-St Jeor BMR (basal metabolic rate).
  const bmr = isFemale
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  // Activity multiplier from training frequency.
  const days = profile.training_days ?? 3;
  const activity =
    days >= 6 ? 1.725 :
    days >= 4 ? 1.55 :
    days >= 2 ? 1.375 :
    1.2;

  let tdee = bmr * activity; // maintenance calories

  // Goal adjustment.
  const goal = profile.goal ?? "";
  if (goal === "perder_grasa") tdee -= 400;               // cut
  else if (goal === "ganar_masa_muscular") tdee += 300;   // lean bulk
  else if (goal === "aumentar_fuerza") tdee += 200;
  else if (goal === "recomposicion" || goal === "tonificar") tdee -= 150;
  // mejorar_salud / default: maintenance

  const calories = Math.round(tdee / 10) * 10;

  // Protein: higher for muscle goals. 1.6–2.2 g/kg.
  const proteinPerKg =
    goal === "ganar_masa_muscular" || goal === "aumentar_fuerza" ? 2.0 :
    goal === "perder_grasa" || goal === "recomposicion" || goal === "tonificar" ? 2.2 :
    1.8;
  const protein_g = Math.round(weight * proteinPerKg);

  // Fats: ~25% of calories (9 kcal/g). Carbs: the rest.
  const fats_g = Math.round((calories * 0.25) / 9);
  const proteinCals = protein_g * 4;
  const fatCals = fats_g * 9;
  const carbs_g = Math.max(0, Math.round((calories - proteinCals - fatCals) / 4));

  // Water: ~35 ml per kg.
  const water_ml = Math.round((weight * 35) / 100) * 100;

  return { calories, protein_g, carbs_g, fats_g, water_ml, personalized: true };
}
