import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save a browser push subscription for the signed-in user.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false }, { status: 200 });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

    const body = await req.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ ok: false, error: "bad_subscription" }, { status: 400 });
    }

    // Upsert by endpoint (one row per device/browser).
    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    }, { onConflict: "endpoint" });

    // Ensure a prefs row exists with the user's timezone offset.
    const tzOffset = typeof body?.timezoneOffset === "number" ? body.timezoneOffset : 0;
    await supabase.from("notification_prefs").upsert({
      user_id: user.id,
      timezone_offset: tzOffset,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 200 });
  }
}

// Remove a subscription (unsubscribe).
export async function DELETE(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false }, { status: 200 });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const { endpoint } = await req.json();
    if (endpoint) {
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
