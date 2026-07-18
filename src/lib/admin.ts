// This module is SERVER ONLY. The `server-only` import makes the build fail if a
// client component ever imports it, so the admin list can never be shipped to
// the browser bundle.
import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Who may use /control.
 *
 * The owner account is always allowed. Extra admins can be added through the
 * ADMIN_EMAILS environment variable (comma separated). Nothing here is a secret
 * (an email is not a credential): access still requires a valid Supabase session
 * for that address, so knowing the email grants nothing on its own.
 */
function adminEmails(): string[] {
  const owner = ["keyvyscabrera@gmail.com"];
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...owner, ...fromEnv])];
}

export type AdminContext = Awaited<ReturnType<typeof createClient>> extends infer C
  ? { supabase: C; user: { id: string; email: string } }
  : never;

/**
 * Verifies the caller is a signed-in admin with a confirmed email.
 * Returns null when they are not. Never throws, never logs anything about the
 * caller, and never reveals why access was denied.
 */
export async function getAdminContext() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;

    const user = data.user;
    const email = user.email?.toLowerCase();
    if (!email) return null;

    // Require a confirmed email: an unconfirmed signup must never reach admin.
    if (!user.email_confirmed_at) return null;

    if (!adminEmails().includes(email)) return null;

    return { supabase, user: { id: user.id, email } };
  } catch {
    // Network or auth failure: fail closed. No admin access on an unverified session.
    return null;
  }
}
