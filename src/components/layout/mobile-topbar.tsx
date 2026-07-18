"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { LogoBadge } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";

// Main tabs never show a back button (they're top-level).
const MAIN_TABS = ["/home", "/workouts", "/coach", "/nutrition", "/progress"];

// Human labels for known sub-pages (fallback: derived from path).
const TITLES: Record<string, string> = {
  "/profile": "Profile",
  "/profile/settings": "Settings",
  "/workouts/create": "Create plan",
  "/session": "Workout",
  "/session/summary": "Summary",
  "/body": "Body",
  "/library": "Library",
};

export function MobileTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [initial, setInitial] = useState<string>("");

  // Load the user's initial once, for the profile button in the sticky header.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let active = true;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      const name = (user?.user_metadata?.full_name as string) || user?.email || "";
      if (name) setInitial(name.trim().charAt(0).toUpperCase());
    })();
    return () => { active = false; };
  }, []);

  const isMainTab = MAIN_TABS.includes(pathname);
  // On main tabs: show a small logo badge. On sub-pages: show a back button.
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/library/") ? "Exercise" : undefined);

  return (
    <header className="glass hairline-b sticky top-0 z-40 flex h-14 items-center gap-2 px-4 lg:hidden">
      {isMainTab ? (
        <>
          <div className="flex items-center gap-2">
            <LogoBadge className="h-8 w-8 rounded-lg" />
            <span className="font-display text-base font-bold">
              GymTrack<span className="text-volt"> Pro</span>
            </span>
          </div>
          <button
            onClick={() => router.push("/library")}
            className="pressable ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted"
            aria-label="Search exercises"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-volt"
            aria-label="Profile"
          >
            {initial || "·"}
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => router.back()}
            className="pressable -ml-1 flex h-9 items-center gap-1 rounded-full pr-2 text-sm font-semibold text-foreground"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>
          {title && <span className="font-display text-sm font-semibold text-muted">{title}</span>}
        </>
      )}
    </header>
  );
}
