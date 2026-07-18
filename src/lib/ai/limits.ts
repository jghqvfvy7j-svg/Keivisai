// Plan & rate-limit enforcement. Server-side only — never trust the client.
// Admin is decided by email (ADMIN_EMAILS env var). Free users get a daily cap.
//
// Coach chat and nutrition (text + photo) SHARE one daily "ai" bucket, since
// both are AI requests. Routines have their own smaller bucket.

import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro" | "admin";

// Coach + nutrition (text and photo) all count against the shared "ai" limit.
const DAILY_LIMITS: Record<Exclude<Plan, "admin">, Record<string, number>> = {
  free: { ai: 15, routine: 3 },
  pro: { ai: 35, routine: 50 },
};

// Burst guard. The daily allowance says nothing about *pace*: without this a
// user (or a script with their token) could spend the whole day's quota in ten
// seconds, or hammer the model API and trip our organisation rate limit for
// everyone else. These are per user, per calendar minute.
const MINUTE_LIMITS: Record<Exclude<Plan, "admin">, number> = {
  free: 6,
  pro: 12,
};

// Map each request type to its billing bucket.
const KIND_TO_BUCKET: Record<string, "ai" | "routine"> = {
  coach: "ai",
  nutrition: "ai",
  routine: "routine",
};

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export type LimitCheck = {
  allowed: boolean;
  plan: Plan;
  used: number;
  limit: number | null; // null = unlimited
  userId: string | null;
  /** Why it was blocked, so the caller can say the right thing. */
  reason?: "daily" | "minute";
};

// Checks (and, if allowed, increments) the user's AI usage for a given kind.
export async function checkAndBumpLimit(kind: "coach" | "nutrition" | "routine"): Promise<LimitCheck> {
  // No Supabase → allow (local/dev), treated as pro-like.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { allowed: true, plan: "pro", used: 0, limit: null, userId: null };
  }
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return { allowed: false, plan: "free", used: 0, limit: 0, userId: null };

    // Admin bypass
    if (user.email && adminEmails().includes(user.email.toLowerCase())) {
      return { allowed: true, plan: "admin", used: 0, limit: null, userId: user.id };
    }

    const { data: profile } = await supabase
      .from("users_profiles").select("plan").eq("user_id", user.id).maybeSingle();
    const plan: Plan = profile?.plan === "pro" ? "pro" : "free";
    const bucket = KIND_TO_BUCKET[kind] ?? "ai";
    const limit = DAILY_LIMITS[plan][bucket];

    // --- Burst guard, checked first and counted even when the daily quota is
    // already spent, so hammering a locked account still gets throttled.
    // If the RPC does not exist yet (migration not run) we skip it rather than
    // lock everyone out: `error` is set, `data` is null.
    const { data: minuteCount, error: minuteError } = await supabase.rpc("bump_ai_minute");
    if (!minuteError && typeof minuteCount === "number") {
      if (minuteCount > MINUTE_LIMITS[plan]) {
        return { allowed: false, plan, used: 0, limit, userId: user.id, reason: "minute" };
      }
    }

    // current usage today (by shared bucket, so coach+nutrition combine)
    const { data: usage } = await supabase
      .from("ai_usage").select("count")
      .eq("user_id", user.id).eq("day", new Date().toISOString().slice(0, 10)).eq("kind", bucket)
      .maybeSingle();
    const used = usage?.count ?? 0;

    if (used >= limit) {
      return { allowed: false, plan, used, limit, userId: user.id, reason: "daily" };
    }

    // bump atomically on the shared bucket
    const { data: newCount } = await supabase.rpc("bump_ai_usage", { p_user: user.id, p_kind: bucket });
    return { allowed: true, plan, used: (newCount as number) ?? used + 1, limit, userId: user.id };
  } catch {
    // FAIL CLOSED. Allowing an uncounted call on error would let anyone who can
    // make the check fail spend the model budget without limit. A blocked
    // message is annoying; an unmetered one is expensive.
    return { allowed: false, plan: "free", used: 0, limit: 0, userId: null, reason: "daily" };
  }
}

export const LIMIT_REPLY =
  "You've used all your daily AI messages on the Free plan (this covers both Coach and nutrition analysis). It resets tomorrow — or upgrade to Pro for more. 💪";

// Shown when someone is going faster than the per-minute guard allows. This is
// a pace problem, not a quota problem, so the wording says so: nothing was
// spent from their daily allowance.
export const BURST_REPLY =
  "Easy there, that was a lot at once. Give me a minute to catch my breath and ask again — this didn't use any of your daily messages.";

/** Picks the right message for a blocked request. */
export function limitReply(reason: "daily" | "minute" | undefined) {
  return reason === "minute" ? BURST_REPLY : LIMIT_REPLY;
}

// Log a blocked/suspicious event.
export async function logSecurityEvent(userId: string | null, reason: string, snippet: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const supabase = await createClient();
    await supabase.from("ai_security_events").insert({
      user_id: userId, reason, snippet: snippet.slice(0, 200),
    });
  } catch { /* best effort */ }
}
