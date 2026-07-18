import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendPush, pushConfigured } from "@/lib/push/web-push";
import { computeNutritionGoal } from "@/lib/nutrition-targets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron hits this endpoint hourly. It finds users whose local time matches
// their reminder hour, checks their activity, and sends the relevant reminders.
//
// Secured by CRON_SECRET: Vercel sends it as a Bearer token automatically.
export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron (or an admin with the secret).
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 200 });
  }

  // Service-role client: the cron runs server-side with no user session, so it
  // needs elevated access to read all users' prefs. This key is NEVER exposed
  // to the browser — it's only used here, in this server-only cron route.
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const nowUtcHour = new Date().getUTCHours();
  const today = new Date().toISOString().slice(0, 10);

  // Get all prefs; we'll filter by local hour in code.
  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("user_id, daily_workout, inactivity, nutrition, streak_risk, reminder_hour, timezone_offset");
  if (!prefs || prefs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  let sent = 0;

  for (const p of prefs) {
    // Compute the user's local hour. timezone_offset is minutes to ADD to UTC.
    const localHour = (((nowUtcHour * 60 + p.timezone_offset) / 60) % 24 + 24) % 24;
    if (Math.floor(localHour) !== p.reminder_hour) continue;

    // Gather this user's recent activity to decide which reminder fits.
    const [{ data: subs }, { data: sessions }, { data: meals }] = await Promise.all([
      supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", p.user_id),
      supabase.from("workout_sessions").select("started_at").eq("user_id", p.user_id).order("started_at", { ascending: false }).limit(1),
      supabase.from("nutrition_logs").select("logged_at").eq("user_id", p.user_id).gte("logged_at", today + "T00:00:00").limit(1),
    ]);
    if (!subs || subs.length === 0) continue;

    // Decide the single most relevant message (avoid spamming multiple).
    const lastSession = sessions?.[0]?.started_at ? new Date(sessions[0].started_at) : null;
    const daysSince = lastSession ? Math.floor((Date.now() - lastSession.getTime()) / 864e5) : 999;

    let msg: { title: string; body: string; url?: string } | null = null;

    // Local weekday (0 = Sunday). timezone_offset is minutes to ADD to UTC.
    const localWeekday = new Date(Date.now() + p.timezone_offset * 60000).getUTCDay();

    // WEEKLY CHECK-IN (Sundays): a positive, data-driven summary of the week's
    // nutrition vs the user's goal. Uses the existing `nutrition` preference as
    // the opt-out. Fires once (this hour is the only match of the day), so no
    // "last sent" tracking is needed. Takes priority over the daily nudge so we
    // never send two. If nothing was logged, we fall through to the daily logic.
    if (p.nutrition && localWeekday === 0) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10) + "T00:00:00";
      const [{ data: prof }, { data: wkMeals }] = await Promise.all([
        supabase.from("users_profiles")
          .select("gender,current_weight_kg,height_cm,age,goal,level,training_days,custom_calories,custom_protein_g,custom_carbs_g,custom_fats_g")
          .eq("user_id", p.user_id).maybeSingle(),
        supabase.from("nutrition_logs")
          .select("calories,protein_g,logged_at").eq("user_id", p.user_id).gte("logged_at", sevenDaysAgo),
      ]);

      const meals7 = wkMeals ?? [];
      if (meals7.length > 0) {
        const byDay = new Map<string, { cal: number; pro: number }>();
        for (const m of meals7) {
          const d = String(m.logged_at).slice(0, 10);
          const e = byDay.get(d) ?? { cal: 0, pro: 0 };
          e.cal += Number(m.calories ?? 0);
          e.pro += Number(m.protein_g ?? 0);
          byDay.set(d, e);
        }
        const loggedDays = byDay.size;
        const totalCal = [...byDay.values()].reduce((s, e) => s + e.cal, 0);
        const totalPro = [...byDay.values()].reduce((s, e) => s + e.pro, 0);
        const avgCals = Math.round(totalCal / loggedDays);
        const avgPro = Math.round(totalPro / loggedDays);
        const goal = computeNutritionGoal(prof ?? {});
        const proHitDays = [...byDay.values()].filter((e) => e.pro >= goal.protein_g * 0.9).length;
        const statusLine =
          avgPro >= goal.protein_g * 0.9
            ? "Protein on point 💪"
            : `Protein ~${Math.max(1, goal.protein_g - avgPro)}g/day short — nudge it up.`;
        msg = {
          title: "Your week 📊",
          body: `${loggedDays}/7 days logged, ~${avgCals} kcal & ${avgPro}g protein/day. Protein goal hit ${proHitDays}/${loggedDays} days. ${statusLine}`,
          url: "/nutrition/energy",
        };
      }
    }

    if (!msg) {
      if (p.streak_risk && daysSince === 1) {
      // Trained yesterday but not today — streak at risk.
      msg = { title: "Keep your streak alive 🔥", body: "You trained yesterday. A quick session today keeps the momentum going.", url: "/workouts" };
    } else if (p.inactivity && daysSince >= 3 && daysSince < 900) {
      msg = { title: "We miss you 💪", body: `It's been ${daysSince} days. Ready to get back to it? Your plan is waiting.`, url: "/workouts" };
    } else if (p.daily_workout) {
      msg = { title: "Time to train 💪", body: "Your workout is ready. Let's make today count.", url: "/workouts" };
    } else if (p.nutrition && (!meals || meals.length === 0)) {
      msg = { title: "Log your meals 🍎", body: "Don't forget to track today's nutrition to stay on target.", url: "/nutrition" };
    }
    }

    if (!msg) continue;

    for (const s of subs) {
      const result = await sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        msg
      );
      if (result === "gone") {
        // Clean up dead subscriptions.
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else if (result === "ok") {
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
