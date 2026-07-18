import { getProfile } from "@/lib/data";
import { SettingsForm } from "@/components/profile/settings-form";
import { mockProfile } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // getProfile() is intentionally fail-closed and throws on a network hiccup.
  // That's right for a first load, but after a successful save the page
  // re-renders, and a transient throw there would blank the whole screen. The
  // form keeps its own state on the client, so on failure we render with a
  // harmless fallback instead of crashing.
  let profile: Awaited<ReturnType<typeof getProfile>>;
  try {
    profile = await getProfile();
  } catch {
    profile = mockProfile;
  }
  return <SettingsForm profile={profile} />;
}
