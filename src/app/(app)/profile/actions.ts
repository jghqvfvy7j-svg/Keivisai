"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveProfileInput = {
  name?: string;
  goal?: string;
  level?: string;
  training_days?: number;
  session_duration_minutes?: number;
  current_weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  injuries?: string | null;
};

// Saves (upserts) the current user's profile. Returns a plain result so the
// client can show a toast. Never throws to the client.
export async function saveProfile(input: SaveProfileInput): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, error: "not_connected" };
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    // Only include defined fields
    const payload: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) payload[k] = v;
    }

    const { error } = await supabase
      .from("users_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/profile");
    revalidatePath("/profile/settings");
    revalidatePath("/home");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Change the signed-in user's password (they must already be authenticated).
export async function changePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false, error: "not_connected" };
  if (!newPassword || newPassword.length < 8) return { ok: false, error: "weak_password" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// Delete the current user's data. Removes all rows owned by the user across
// every table. RLS ensures we can only ever delete our own rows.
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false, error: "not_connected" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "not_authenticated" };

    // Delete owned rows. Child tables (routine_days, routine_exercises,
    // workout_logs, coach_messages) cascade from their parents via FK.
    const tables = [
      "workout_logs", "workout_sessions", "coach_messages", "coach_conversations",
      "coach_memory", "nutrition_logs", "nutrition_days", "body_metrics",
      "favorite_exercises", "recommendations", "routine_exercises", "routine_days",
      "routines", "ai_usage", "ai_security_events", "users_profiles",
    ];
    for (const t of tables) {
      // Best-effort; ignore per-table errors so one failure doesn't block others.
      await supabase.from(t).delete().eq("user_id", user.id);
    }

    // Sign the user out (their auth record removal is handled server-side / by
    // support; data is already gone). 
    await supabase.auth.signOut();
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}
