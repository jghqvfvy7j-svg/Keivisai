import Link from "next/link";
import { ChevronLeft, Clock, Flame } from "lucide-react";
import { getRecipesByMeal, mealTypeLabels, MEAL_TYPES, type Recipe } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recipes" };

export default async function RecipesPage() {
  const grouped = await getRecipesByMeal();
  const total = MEAL_TYPES.reduce((n, m) => n + grouped[m].length, 0);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/nutrition" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-extrabold">Recipes</h1>
          <p className="text-sm text-muted">Every gram measured, every macro calculated.</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">
            No recipes yet. Run <span className="font-mono text-xs">supabase/recetas.sql</span> to load them.
          </p>
        </div>
      ) : (
        MEAL_TYPES.map((meal) =>
          grouped[meal].length === 0 ? null : (
            <section key={meal}>
              <h2 className="mb-2 font-display text-lg font-bold">{mealTypeLabels[meal]}</h2>
              <div className="flex flex-col gap-2">
                {grouped[meal].map((r) => (
                  <RecipeCard key={r.id} recipe={r} />
                ))}
              </div>
            </section>
          )
        )
      )}
    </div>
  );
}

function RecipeCard({ recipe: r }: { recipe: Recipe }) {
  return (
    <Link
      href={`/nutrition/recipes/${r.slug}`}
      className="rounded-2xl border border-border bg-surface p-4 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold leading-tight">{r.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-score text-lg font-bold text-volt">{r.calories}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-2">kcal</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Flame className="h-3 w-3" /> {r.protein_g}g protein
        </span>
        <span>{r.carbs_g}g carbs</span>
        <span>{r.fat_g}g fat</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {r.prep_minutes + r.cook_minutes} min
        </span>
      </div>
    </Link>
  );
}
