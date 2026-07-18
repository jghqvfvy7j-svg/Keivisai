import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Users, AlertTriangle, Lightbulb, Hand, Thermometer, Flame, Refrigerator, Blend, UtensilsCrossed } from "lucide-react";
import { getRecipe } from "@/lib/recipes";
import { LogRecipeButton } from "@/components/nutrition/log-recipe-button";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = await getRecipe(slug);
  if (!recipe) notFound();

  const totalMinutes = recipe.prep_minutes + recipe.cook_minutes;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/nutrition/recipes" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-xl font-extrabold leading-tight">{recipe.name}</h1>
      </div>

      <p className="text-sm text-muted">{recipe.description}</p>

      {/* Macros per serving */}
      <div className="grid grid-cols-4 gap-2">
        <Macro value={recipe.calories} unit="kcal" highlight />
        <Macro value={recipe.protein_g} unit="protein" />
        <Macro value={recipe.carbs_g} unit="carbs" />
        <Macro value={recipe.fat_g} unit="fat" />
      </div>
      <p className="-mt-3 text-center text-[11px] text-muted-2">
        Per serving. {recipe.fiber_g}g fiber.
      </p>

      <div className="flex flex-wrap gap-2 text-xs">
        <Chip icon={<Clock className="h-3 w-3" />}>
          {totalMinutes} min total
        </Chip>
        {recipe.active_minutes > 0 && recipe.active_minutes < totalMinutes && (
          <Chip icon={<Hand className="h-3 w-3" />}>
            {recipe.active_minutes} min hands-on
          </Chip>
        )}
        <Chip icon={<Users className="h-3 w-3" />}>
          {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
        </Chip>
        <Chip>{recipe.difficulty}</Chip>
      </div>

      {recipe.allergens.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <p className="text-xs text-muted">
            <span className="font-semibold text-coral">Contains:</span> {recipe.allergens.join(", ")}
          </p>
        </div>
      )}

      {/* Ingredients: exact grams, no guessing */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Ingredients</h2>
        <div className="flex flex-col gap-1.5">
          {recipe.ingredients.map((ing, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <span className="text-sm">
                {ing.name}
                {ing.note && <span className="text-muted"> · {ing.note}</span>}
              </span>
              <span className="font-score shrink-0 text-sm font-bold text-volt">{ing.grams}g</span>
            </div>
          ))}
        </div>
        {recipe.servings > 1 && (
          <p className="mt-2 text-[11px] text-muted-2">
            Amounts shown per serving. This recipe makes {recipe.servings}, so multiply by {recipe.servings} when you shop.
          </p>
        )}
      </section>

      {/* Steps */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Method</h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-score flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-volt/15 text-sm font-bold text-volt">
                {i + 1}
              </span>
              <div className="flex-1 pt-0.5">
                {(step.method || step.minutes || step.temp_c) && (
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    {step.method && step.method !== "prep" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-semibold capitalize text-muted">
                        {methodIcon(step.method)} {methodLabel(step.method)}
                      </span>
                    )}
                    {step.minutes ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-muted">
                        <Clock className="h-3 w-3" /> {formatStepTime(step.minutes)}
                      </span>
                    ) : null}
                    {step.temp_c ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-coral/15 px-2 py-0.5 text-[11px] font-semibold text-coral">
                        <Thermometer className="h-3 w-3" /> {step.temp_c}°C
                      </span>
                    ) : null}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
            <Lightbulb className="h-4 w-4 text-volt" /> Worth knowing
          </h2>
          <div className="flex flex-col gap-2">
            {recipe.tips.map((tip, i) => (
              <p key={i} className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
                {tip}
              </p>
            ))}
          </div>
        </section>
      )}

      <LogRecipeButton
        name={recipe.name}
        calories={recipe.calories}
        protein={recipe.protein_g}
        carbs={recipe.carbs_g}
        fat={recipe.fat_g}
      />
    </div>
  );
}

function Macro({ value, unit, highlight }: { value: number; unit: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3 text-center">
      <p className={"font-score text-lg font-bold " + (highlight ? "text-volt" : "")}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-2">{unit}</p>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 capitalize text-muted">
      {icon}
      {children}
    </span>
  );
}

const methodLabel = (m: string) =>
  ({ oven: "Oven", stovetop: "Stovetop", blender: "Blender", chill: "Chill", prep: "Prep" }[m] ?? m);

function methodIcon(m: string) {
  const cls = "h-3 w-3";
  if (m === "oven") return <Flame className={cls} />;
  if (m === "stovetop") return <UtensilsCrossed className={cls} />;
  if (m === "blender") return <Blend className={cls} />;
  if (m === "chill") return <Refrigerator className={cls} />;
  return null;
}

function formatStepTime(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  return `${min} min`;
}
