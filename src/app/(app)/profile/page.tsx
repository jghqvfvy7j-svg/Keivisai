import Link from "next/link";
import { ChevronRight, Settings, LogOut, Ruler, Target, BarChart3 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile, displayName } from "@/lib/data";
import { goalLabels } from "@/lib/labels";
import { difficultyLabels } from "@/lib/labels";
import { CoachMemorySettings } from "@/components/profile/coach-memory-settings";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  const name = displayName(profile);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 pt-2">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-display text-xl font-extrabold">{name}</h1>
          <p className="text-sm text-muted">
            {profile.age ? `${profile.age} yrs · ` : ""}Level: {difficultyLabels[profile.level as keyof typeof difficultyLabels] ?? profile.level}
          </p>
        </div>
      </div>

      {/* Physical stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-score text-xl font-bold">{profile.current_weight_kg ?? "—"}</p>
            <p className="text-[11px] text-muted">kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-score text-xl font-bold">{profile.height_cm ?? "—"}</p>
            <p className="text-[11px] text-muted">cm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="font-score text-xl font-bold">{profile.training_days}</p>
            <p className="text-[11px] text-muted">days/wk</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <Target className="h-4.5 w-4.5 text-volt" />
          </span>
          <div>
            <p className="text-sm font-semibold">Current goal</p>
            <p className="text-xs text-muted">{goalLabels[profile.goal]}</p>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex flex-col gap-2">
        <ProfileLink href="/profile/settings" icon={Settings} label="Account settings" />
        <ProfileLink href="/progress" icon={BarChart3} label="Progress history" />
        <ProfileLink href="/body" icon={Ruler} label="Body & measurements" />
      </div>

      {/* Coach memory: consent, what it remembers, and how to erase it. */}
      <CoachMemorySettings />

      <Link
        href="/login"
        className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-danger"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </Link>

      <p className="pb-2 text-center text-xs text-muted-2">GymTrack Pro · v{APP_VERSION}</p>
    </div>
  );
}

function ProfileLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-volt/40">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2">
              <Icon className="h-4 w-4 text-muted" />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted" />
        </CardContent>
      </Card>
    </Link>
  );
}
