"use client";

import { Flame, Droplet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { localToday, localDayOf } from "@/lib/local-date";

type Meal = { logged_at: string; calories: number; protein_g: number };

/**
 * Today's calories and protein, decided by the DEVICE.
 *
 * The server runs in UTC and cannot know what day it is where the user is. It
 * hands us a window of meals around today; we keep only the ones that fall on
 * the user's own calendar day. Without this, someone in Colombia or Ohio saw
 * last night's dinner counted against this morning's budget, and Home disagreed
 * with the Nutrition tab.
 */
export function TodayMacros({
  meals,
  goalCalories,
  goalProtein,
}: {
  meals: Meal[];
  goalCalories: number;
  goalProtein: number;
}) {
  const today = localToday();
  const todays = meals.filter((m) => localDayOf(m.logged_at) === today);

  const calories = Math.round(todays.reduce((s, m) => s + m.calories, 0));
  const protein = Math.round(todays.reduce((s, m) => s + m.protein_g, 0));

  const caloriesLeft = Math.max(0, goalCalories - calories);
  const proteinLeft = Math.max(0, goalProtein - protein);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-coral">
            <Flame className="h-3.5 w-3.5" /> Calories left
          </p>
          <p className="font-score mt-1 text-2xl font-extrabold">{caloriesLeft.toLocaleString()}</p>
          <Progress
            value={goalCalories ? (calories / goalCalories) * 100 : 0}
            className="mt-2 h-1.5"
            indicatorClassName="bg-coral"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-volt">
            <Droplet className="h-3.5 w-3.5" /> Protein left
          </p>
          <p className="font-score mt-1 text-2xl font-extrabold">{proteinLeft}g</p>
          <Progress value={goalProtein ? (protein / goalProtein) * 100 : 0} className="mt-2 h-1.5" />
        </CardContent>
      </Card>
    </div>
  );
}
