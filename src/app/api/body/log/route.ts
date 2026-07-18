import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  weight_kg: z.number().positive().max(500).optional(),
  height_cm: z.number().positive().max(300).optional(),
  waist_cm: z.number().positive().max(300).optional(),
  chest_cm: z.number().positive().max(300).optional(),
  arm_cm: z.number().positive().max(150).optional(),
  leg_cm: z.number().positive().max(200).optional(),
  hip_cm: z.number().positive().max(300).optional(),
  notes: z.string().max(500).optional(),
});

// Log a body measurement entry for the signed-in user.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    const d = parsed.data;

    // Require at least a weight or one measurement.
    if (!d.weight_kg && !d.waist_cm && !d.chest_cm && !d.arm_cm && !d.leg_cm && !d.hip_cm) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
    }

    const { data: row, error } = await supabase.from("body_metrics").insert({
      user_id: user.id,
      weight_kg: d.weight_kg ?? null,
      height_cm: d.height_cm ?? null,
      waist_cm: d.waist_cm ?? null,
      chest_cm: d.chest_cm ?? null,
      arm_cm: d.arm_cm ?? null,
      leg_cm: d.leg_cm ?? null,
      hip_cm: d.hip_cm ?? null,
      notes: d.notes ?? null,
      recorded_at: new Date().toISOString(),
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });

    // Keep the profile's current weight in sync.
    if (d.weight_kg) {
      await supabase.from("users_profiles").update({ current_weight_kg: d.weight_kg }).eq("user_id", user.id);
    }

    return NextResponse.json({ ok: true, entry: row });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
