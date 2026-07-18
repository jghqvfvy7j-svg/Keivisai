import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getProfile, displayName } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  // Single gate for EVERY way into the app. Email signup used to push people to
  // onboarding by hand, which left OAuth (Google) with no such push. Checking it
  // here means anyone without a finished profile is collected the same way, no
  // matter how they signed in. /onboarding lives outside this layout, so this
  // cannot loop.
  if (profile && profile.onboarding_completed === false) {
    redirect("/onboarding");
  }

  return <AppShell userName={displayName(profile)}>{children}</AppShell>;
}
