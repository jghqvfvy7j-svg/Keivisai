import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type RecipeIngredient = {
  name: string;
  grams: number;
  note: string | null;
};

export type RecipeStep = {
  text: string;
  method: "oven" | "stovetop" | "blender" | "chill" | "prep" | null;
  minutes: number | null;
  temp_c: number | null;
};

export type Recipe = {
  id: string;
  slug: string;
  name: string;
  meal_type: MealType;
  description: string;
  difficulty: string;
  prep_minutes: number;
  cook_minutes: number;
  active_minutes: number;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips: string[];
  tags: string[];
  allergens: string[];
  image_url: string | null;
};

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

/**
 * The whole catalogue. It is small (two dozen rows) and identical for everyone,
 * so there is nothing to paginate and nothing user-specific to leak.
 * Returns an empty list rather than throwing if the table does not exist yet.
 */
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .order("meal_type")
      .order("calories");
    if (error || !data) return [];
    return data as Recipe[];
  } catch {
    return [];
  }
}

export async function getRecipe(slug: string): Promise<Recipe | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("recipes").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    return data as Recipe;
  } catch {
    return null;
  }
}

/** Grouped for the listing screen, in the order you eat them. */
export async function getRecipesByMeal(): Promise<Record<MealType, Recipe[]>> {
  const all = await getRecipes();
  const grouped = { breakfast: [], lunch: [], dinner: [], snack: [] } as Record<MealType, Recipe[]>;
  for (const r of all) grouped[r.meal_type]?.push(r);
  return grouped;
}

/**
 * A compact index of the catalogue for the AI coach's context.
 *
 * This is public catalogue data, exactly like the exercise library: it holds no
 * personal information, so no user's data can ever reach another user through
 * it. The coach uses it to suggest real recipes with real numbers instead of
 * inventing meals and guessing their macros.
 */
export async function getRecipeIndexForCoach(): Promise<string[]> {
  const all = await getRecipes();
  return all.map(
    (r) =>
      `${r.name} (${r.meal_type}, ${r.calories} kcal, ${r.protein_g}g protein, ${r.carbs_g}g carbs, ${r.fat_g}g fat, ${r.prep_minutes + r.cook_minutes} min${r.tags.length ? ", " + r.tags.join("/") : ""})`
  );
}
