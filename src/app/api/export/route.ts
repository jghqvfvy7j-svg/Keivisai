import { getCurrentUser } from "@/lib/supabase/user";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exports all of the signed-in user's data as a JSON download.
// Good for user trust and data-portability (GDPR-style right to your data).
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "not_connected" }, { status: 200 });
  }
  const supabase = await createClient();
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  // Pull each table the user owns. RLS ensures we only get their rows.
  const tables = [
    "users_profiles", "routines", "routine_days", "routine_exercises",
    "workout_sessions", "workout_logs", "nutrition_logs", "nutrition_days",
    "body_metrics", "coach_conversations", "coach_messages", "coach_memory",
  ];

  const data: Record<string, unknown> = {};
  for (const t of tables) {
    try {
      const { data: rows } = await supabase.from(t).select("*").eq("user_id", user.id);
      data[t] = rows ?? [];
    } catch {
      data[t] = [];
    }
  }

  const payload = {
    exported_at: new Date().toISOString(),
    app: "GymTrack Pro",
    user_email: user.email,
    data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="gymtrackpro-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
