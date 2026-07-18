import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MealSchema = z.object({
  meal_name: z.string().min(1).max(120),
  calories: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(1000),
  carbs_g: z.number().min(0).max(1000),
  fats_g: z.number().min(0).max(1000),
  source: z.enum(["manual", "ai"]).default("manual"),
  ai_confidence: z.enum(["low", "medium", "high"]).optional(),
  description: z.string().max(500).optional(),
  items: z.array(z.object({
    food: z.string().max(120),
    qty: z.string().max(60).optional(),
    calories: z.number().min(0).max(10000).optional(),
  })).max(30).optional(),
});

// Save a meal for the authenticated user and recalc the daily summary.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "not_connected" }, { status: 200 });
  }
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const parsed = MealSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const m = parsed.data;
    const { error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      meal_name: m.meal_name,
      calories: m.calories, protein_g: m.protein_g, carbs_g: m.carbs_g, fats_g: m.fats_g,
      source: m.source, ai_confidence: m.ai_confidence ?? null,
      notes: m.description ?? null,
      items: m.items ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // recalc daily summary
    await supabase.rpc("recalc_nutrition_day", { p_user: user.id, p_day: new Date().toISOString().slice(0, 10) });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("nutrition log error:", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// Delete a meal owned by the authenticated user, then recalc the day.
export async function DELETE(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "no_id" }, { status: 400 });
    // RLS ensures we can only delete our own; the user_id filter is belt-and-suspenders.
    await supabase.from("nutrition_logs").delete().eq("id", id).eq("user_id", user.id);
    await supabase.rpc("recalc_nutrition_day", { p_user: user.id, p_day: new Date().toISOString().slice(0, 10) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
