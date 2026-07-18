import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SessionSchema = z.object({
  focus: z.string().max(120).optional(),
  durationMinutes: z.number().min(0).max(600),
  totalVolume: z.number().min(0).max(1_000_000),
  totalSets: z.number().min(0).max(1000),
  totalReps: z.number().min(0).max(10000),
  fatigue: z.object({
    difficulty: z.number().min(1).max(10).optional(),
    energy: z.number().min(1).max(10).optional(),
    motivation: z.number().min(1).max(10).optional(),
    recovery: z.number().min(1).max(10).optional(),
  }).optional(),
  logs: z.array(z.object({
    exerciseId: z.string().uuid().optional(),
    sets: z.array(z.object({
      weight: z.number().min(0).max(2000),
      reps: z.number().min(0).max(1000),
      completed: z.boolean(),
    })),
  })).optional(),
});

// Persist a completed workout session + set logs for the AI coach to learn from.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ error: "not_connected" }, { status: 200 });
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const parsed = SessionSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const s = parsed.data;
    const now = new Date();
    const started = new Date(now.getTime() - s.durationMinutes * 60000);

    const { data: session, error } = await supabase.from("workout_sessions").insert({
      user_id: user.id,
      focus: s.focus ?? null,
      started_at: started.toISOString(),
      ended_at: now.toISOString(),
      duration_minutes: s.durationMinutes,
      total_volume_kg: s.totalVolume,
      total_sets: s.totalSets,
      total_reps: s.totalReps,
      difficulty_1_10: s.fatigue?.difficulty ?? null,
      energy_1_10: s.fatigue?.energy ?? null,
      motivation_1_10: s.fatigue?.motivation ?? null,
      recovery_1_10: s.fatigue?.recovery ?? null,
    }).select().single();
    if (error || !session) return NextResponse.json({ error: error?.message ?? "failed" }, { status: 500 });

    // set logs (only those with an exercise id)
    const prs: { exerciseId: string; weight: number; reps: number }[] = [];
    if (s.logs?.length) {
      // Detect personal records: for each exercise in this session, compare the
      // heaviest completed set against the user's previous best weight.
      const exerciseIds = [...new Set(s.logs.map((ex) => ex.exerciseId).filter(Boolean))] as string[];
      if (exerciseIds.length) {
        const { data: history } = await supabase
          .from("workout_logs")
          .select("exercise_id, weight_kg, session_id, workout_sessions!inner(user_id)")
          .in("exercise_id", exerciseIds)
          .eq("workout_sessions.user_id", user.id)
          .eq("completed", true);
        const bestByExercise = new Map<string, number>();
        for (const h of history ?? []) {
          const w = Number(h.weight_kg ?? 0);
          if (w > (bestByExercise.get(h.exercise_id) ?? 0)) bestByExercise.set(h.exercise_id, w);
        }
        // Check this session's best set per exercise.
        for (const ex of s.logs) {
          if (!ex.exerciseId) continue;
          const best = ex.sets.filter((st) => st.completed).reduce(
            (acc, st) => (st.weight > acc.weight ? { weight: st.weight, reps: st.reps } : acc),
            { weight: 0, reps: 0 }
          );
          const prevBest = bestByExercise.get(ex.exerciseId) ?? 0;
          if (best.weight > prevBest && best.weight > 0 && prevBest > 0) {
            prs.push({ exerciseId: ex.exerciseId, weight: best.weight, reps: best.reps });
          }
        }
      }

      const rows = s.logs.flatMap((ex) =>
        ex.exerciseId
          ? ex.sets.map((set, i) => ({
              session_id: session.id, exercise_id: ex.exerciseId!,
              set_number: i + 1, weight_kg: set.weight, reps: set.reps, completed: set.completed,
            }))
          : []
      );
      if (rows.length) await supabase.from("workout_logs").insert(rows);
    }

    return NextResponse.json({ ok: true, sessionId: session.id, prs });
  } catch (e) {
    // Sanitized log: only the error message, never the payload, headers,
    // cookies or any auth material.
    console.error("session save error:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// Delete a workout session (and its logs cascade) owned by the user.
export async function DELETE(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false });
  try {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "no_id" }, { status: 400 });
    await supabase.from("workout_sessions").delete().eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
