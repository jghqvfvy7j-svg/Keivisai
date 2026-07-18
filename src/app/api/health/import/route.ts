import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Allow a larger request body for the filtered health XML (default is small).
export const fetchCache = "force-no-store";

// Parses an Apple Health export.xml (uploaded as text) and imports workouts +
// daily heart-rate summaries for the signed-in user.
//
// The client extracts export.xml from the Health .zip and sends its text here.
// We parse with lightweight regex over the XML records/workouts to avoid loading
// a heavy XML library, and to survive very large files reasonably.
export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 200 });
  }
  const supabase = await createClient();
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  let xml: string;
  let clientHeartDaily: Array<{ day: string; resting_hr: number | null; avg_hr: number | null; max_hr: number | null }> = [];
  try {
    const body = await req.json();
    xml = body?.xml;
    if (Array.isArray(body?.heartDaily)) clientHeartDaily = body.heartDaily;
    if (!xml || typeof xml !== "string") throw new Error();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // --- Parse workouts ---
  // <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30"
  //   ... startDate="..." endDate="..." > ... <WorkoutStatistics .../> </Workout>
  const workouts: Record<string, unknown>[] = [];
  const workoutRe = /<Workout\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/Workout>)/g;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = workoutRe.exec(xml)) !== null && count < 2000) {
    const attrs = parseAttrs(m[1]);
    const inner = m[2] || "";
    const type = cleanType(attrs["workoutActivityType"]);
    const start = attrs["startDate"];
    const end = attrs["endDate"];
    if (!start) continue;

    // Distance & energy can be attributes (older exports) or WorkoutStatistics (newer).
    const distanceKm = num(attrs["totalDistance"]) ?? statSum(inner, "DistanceWalkingRunning") ?? statSum(inner, "DistanceCycling");
    const energy = num(attrs["totalEnergyBurned"]) ?? statSum(inner, "ActiveEnergyBurned");
    const durationMin = num(attrs["duration"]);
    const avgHr = statAvg(inner, "HeartRate");
    const maxHr = statMax(inner, "HeartRate");

    workouts.push({
      user_id: user.id,
      activity_type: type,
      started_at: appleDate(start),
      ended_at: end ? appleDate(end) : null,
      duration_min: durationMin ?? null,
      distance_km: distanceKm ?? null,
      active_energy_kcal: energy ?? null,
      avg_heart_rate: avgHr ?? null,
      max_heart_rate: maxHr ?? null,
      external_id: `${start}|${type}`,
    });
    count++;
  }

  // Heart data is pre-aggregated by day in the browser (keeps the upload small).
  const heartRows: Record<string, unknown>[] = clientHeartDaily
    .filter((h) => h && h.day)
    .map((h) => ({
      user_id: user.id,
      day: h.day,
      resting_hr: h.resting_hr ?? null,
      avg_hr: h.avg_hr ?? null,
      max_hr: h.max_hr ?? null,
    }));

  // --- Upsert into Supabase (in batches) ---
  let importedWorkouts = 0;
  let importedDays = 0;
  try {
    for (let i = 0; i < workouts.length; i += 500) {
      const batch = workouts.slice(i, i + 500);
      const { error } = await supabase.from("health_workouts").upsert(batch, { onConflict: "user_id,external_id" });
      if (!error) importedWorkouts += batch.length;
    }
    for (let i = 0; i < heartRows.length; i += 500) {
      const batch = heartRows.slice(i, i + 500);
      const { error } = await supabase.from("health_heart_daily").upsert(batch, { onConflict: "user_id,day" });
      if (!error) importedDays += batch.length;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 200 });
  }

  return NextResponse.json({ ok: true, workouts: importedWorkouts, heartDays: importedDays });
}

// --- helpers ---
function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out[m[1]] = m[2];
  return out;
}
function num(v?: string): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
function cleanType(t?: string): string {
  if (!t) return "Workout";
  return t.replace("HKWorkoutActivityType", "").replace(/([a-z])([A-Z])/g, "$1 $2");
}
// Apple dates look like "2026-07-05 14:30:00 -0400"; make them ISO-ish.
function appleDate(d: string): string {
  return d.replace(" ", "T").replace(/ ([+-]\d{4})$/, "$1");
}
// Sum a WorkoutStatistics sum attribute by type.
function statSum(inner: string, type: string): number | null {
  const re = new RegExp(`<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifier${type}"[^>]*sum="([\\d.]+)"`, "i");
  const m = inner.match(re);
  return m ? num(m[1]) : null;
}
function statAvg(inner: string, type: string): number | null {
  const re = new RegExp(`<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifier${type}"[^>]*average="([\\d.]+)"`, "i");
  const m = inner.match(re);
  return m ? Math.round(parseFloat(m[1])) : null;
}
function statMax(inner: string, type: string): number | null {
  const re = new RegExp(`<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifier${type}"[^>]*maximum="([\\d.]+)"`, "i");
  const m = inner.match(re);
  return m ? Math.round(parseFloat(m[1])) : null;
}
