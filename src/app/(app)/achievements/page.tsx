import * as Icons from "lucide-react";
import { getAchievements } from "@/lib/achievements";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Achievements — GymTrack Pro" };

export default async function AchievementsPage() {
  const { achievements, unlockedCount } = await getAchievements();

  return (
    <div className="flex flex-col gap-5 pb-6">
      <BackButton />
      <div>
        <h1 className="font-display text-2xl font-extrabold">Achievements</h1>
        <p className="mt-1 text-sm text-muted">
          {unlockedCount} of {achievements.length} unlocked. Keep training to earn more.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {achievements.map((a) => {
          // Resolve the lucide icon by name; fall back to a trophy.
          const Icon = (Icons[a.icon as keyof typeof Icons] as React.ElementType) ?? Icons.Trophy;
          const pct = a.progress ? Math.round((a.progress.current / a.progress.target) * 100) : 0;
          return (
            <Card key={a.id} className={a.unlocked ? "border-volt/40" : "opacity-70"}>
              <CardContent className="flex flex-col items-center p-4 text-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    a.unlocked ? "bg-volt/15 text-volt" : "bg-surface-2 text-muted-2"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-2 text-sm font-semibold">{a.name}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted">{a.description}</p>
                {!a.unlocked && a.progress && a.progress.target > 1 && (
                  <div className="mt-2 w-full">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-volt/60" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-2">
                      {a.progress.current} / {a.progress.target}
                    </p>
                  </div>
                )}
                {a.unlocked && (
                  <span className="mt-2 rounded-full bg-volt/15 px-2 py-0.5 text-[10px] font-semibold text-volt">
                    Unlocked
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
