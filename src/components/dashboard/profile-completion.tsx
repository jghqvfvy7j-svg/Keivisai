import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProfileCompletion } from "@/lib/data";

// Retention nudge: shows how complete the profile is + the next thing to add.
// Hidden entirely when the profile is 100% complete.
export function ProfileCompletionCard({ completion }: { completion: ProfileCompletion }) {
  if (completion.percent >= 100 || completion.missing.length === 0) return null;
  const next = completion.missing[0];

  return (
    <Card className="animate-fade-up border-volt/25">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Complete your profile</p>
          <span className="font-score text-sm font-bold text-volt">{completion.percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-volt transition-all" style={{ width: `${completion.percent}%` }} />
        </div>
        <Link
          href={next.href}
          className="pressable mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted" />
            {next.label}
          </span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      </CardContent>
    </Card>
  );
}
