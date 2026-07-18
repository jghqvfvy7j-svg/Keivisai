import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getIntakeRaw } from "@/lib/data";
import { CalorieIntakeClient } from "@/components/nutrition/net-energy-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Calorie Intake" };

export default async function CalorieIntakePage() {
  const { meals, goal } = await getIntakeRaw(180);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Link
          href="/nutrition"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-extrabold">Calorie intake</h1>
          <p className="text-sm text-muted">What you ate, against your daily goal.</p>
        </div>
      </div>

      <CalorieIntakeClient meals={meals} goal={goal} />
    </div>
  );
}
