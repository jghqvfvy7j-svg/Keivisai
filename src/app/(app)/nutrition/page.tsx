import Link from "next/link";
import { ChefHat, ChevronRight, Activity } from "lucide-react";
import { getTodayMeals, getWeekNutrition, getProfile } from "@/lib/data";
import { NutritionClient } from "@/components/nutrition/nutrition-client";
import { computeNutritionGoal } from "@/lib/nutrition-targets";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const [meals, week, profile] = await Promise.all([
    getTodayMeals(),
    getWeekNutrition(),
    getProfile(),
  ]);
  const goal = computeNutritionGoal(profile);
  return (
    <div className="flex flex-col gap-4">
      <NutritionClient
        initialMeals={meals}
        week={week}
        goal={{ calories: goal.calories, protein_g: goal.protein_g, carbs_g: goal.carbs_g, fats_g: goal.fats_g }}
        personalized={goal.personalized}
      />

      {/* Calorie intake: what you ate per day vs your goal, all real. */}
      <Link
        href="/nutrition/energy"
        className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <Activity className="h-5 w-5 text-volt" />
          </span>
          <div>
            <p className="font-semibold">Calorie intake</p>
            <p className="text-xs text-muted">Your daily intake, against your goal.</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-2" />
      </Link>

      {/* Recipes: exact grams, macros already calculated, one tap to log. */}
      <Link
        href="/nutrition/recipes"
        className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <ChefHat className="h-5 w-5 text-volt" />
          </span>
          <div>
            <p className="font-semibold">Recipes</p>
            <p className="text-xs text-muted">Every gram measured. Log one in a tap.</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-2" />
      </Link>
    </div>
  );
}
