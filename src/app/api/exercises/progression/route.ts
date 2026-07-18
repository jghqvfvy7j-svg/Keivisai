import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { getProgressionSuggestion } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns an auto-progression tip for an exercise based on the last session.
export async function GET(req: NextRequest) {
  // Require auth so we never do work for anonymous callers.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { user } = await getCurrentUser();
    if (!user) return NextResponse.json({ suggestion: null });
  }
  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get("exerciseId");
  const targetReps = searchParams.get("reps") ?? "8-12";
  if (!exerciseId) return NextResponse.json({ suggestion: null });
  const suggestion = await getProgressionSuggestion(exerciseId, targetReps);
  return NextResponse.json({ suggestion });
}
