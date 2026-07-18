import Link from "next/link";
import { Check, Sparkles, Zap, Camera, Dumbbell, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Upgrade to Pro — GymTrack Pro" };

const PRO_PERKS = [
  { icon: Zap, text: "35 AI messages per day (coach + nutrition)" },
  { icon: Dumbbell, text: "Up to 50 workout plans" },
  { icon: Camera, text: "Priority photo nutrition analysis" },
  { icon: Sparkles, text: "Early access to new features" },
];

export default function UpgradePage() {
  return (
    <div className="flex flex-col gap-6 pb-6">
      <Link href="/home" className="flex items-center gap-1.5 pt-2 text-sm font-semibold text-muted">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-volt/15 px-3 py-1 text-xs font-semibold text-volt">
          <Sparkles className="h-3 w-3" /> GymTrack Pro
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold">Train without limits</h1>
        <p className="mt-2 text-sm text-muted">
          Get more AI coaching, more plans, and priority features.
        </p>
      </div>

      <Card className="border-volt/30">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
            {PRO_PERKS.map((p) => (
              <div key={p.text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-volt/15 text-volt">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-sm">{p.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border bg-surface-2 p-5 text-center">
        <p className="text-sm text-muted">
          Pro plans are coming soon. Want early access or have questions?
        </p>
        <Button asChild className="pressable mt-3">
          <a href="mailto:soporte@gymtrackpro.xyz?subject=GymTrack%20Pro%20-%20Upgrade%20interest">
            Contact us about Pro
          </a>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-2">
        Your Free plan already includes full workout tracking, plans, and daily AI coaching.
      </p>
    </div>
  );
}
