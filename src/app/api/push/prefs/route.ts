import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET current notification preferences.
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ prefs: null });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ prefs: null }, { status: 401 });
    const { data } = await supabase
      .from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
    return NextResponse.json({ prefs: data });
  } catch {
    return NextResponse.json({ prefs: null });
  }
}

// Update preferences (which reminders + preferred hour).
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const b = await req.json();
    const payload: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const k of ["daily_workout", "inactivity", "nutrition", "streak_risk"]) {
      if (typeof b[k] === "boolean") payload[k] = b[k];
    }
    if (typeof b.reminder_hour === "number" && b.reminder_hour >= 0 && b.reminder_hour <= 23) {
      payload.reminder_hour = b.reminder_hour;
    }
    if (typeof b.timezone_offset === "number") payload.timezone_offset = b.timezone_offset;
    await supabase.from("notification_prefs").upsert(payload, { onConflict: "user_id" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
