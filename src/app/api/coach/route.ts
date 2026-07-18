import { NextRequest, NextResponse, after } from "next/server";
import { callAnthropic, extractText, hasApiKey, stripFormatting, streamAnthropic, type AiMessage } from "@/lib/ai/anthropic";
import { coachIdentity, buildContextBlock } from "@/lib/ai/persona";
import { computeNutritionGoal } from "@/lib/nutrition-targets";
import { guardUserMessage, GUARD_REPLY } from "@/lib/ai/guard";
import { ipRateLimit, getClientIp } from "@/lib/ai/ip-limit";
import { buildRoutine, saveRoutine, type Split } from "@/lib/ai/routine-builder";
import { checkAndBumpLimit, limitReply, logSecurityEvent } from "@/lib/ai/limits";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Model calls can take a while. Without this, Vercel kills the function early.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Parses and clamps an integer, or returns undefined if absent/invalid. */
function clampInt(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const SET_NUTRITION_TOOL = {
  name: "set_nutrition_targets",
  description:
    "Set the user's daily calorie and macro targets, which then show in the Nutrition tab. Call this when the user asks you to work out how much they should eat (e.g. to lose fat, tone up, or gain muscle) based on their weight, height and goal. Compute sensible numbers yourself before calling. Only call it when the user actually wants their targets set or changed.",
  input_schema: {
    type: "object",
    properties: {
      calories: { type: "integer", minimum: 1000, maximum: 6000, description: "Daily calorie target." },
      protein_g: { type: "integer", minimum: 0, maximum: 400, description: "Daily protein in grams." },
      carbs_g: { type: "integer", minimum: 0, maximum: 800, description: "Daily carbohydrates in grams." },
      fats_g: { type: "integer", minimum: 0, maximum: 300, description: "Daily fats in grams." },
      rationale: { type: "string", description: "One short sentence, in the user's language, on why these numbers." },
    },
    required: ["calories"],
  },
};

const GENERATE_ROUTINE_TOOL = {
  name: "generate_routine",
  description:
    "Build and save a structured training plan with 4-5 exercises per day. Call this whenever the user wants a workout plan/routine/program created.",
  input_schema: {
    type: "object",
    properties: {
      split: { type: "string", enum: ["full_body", "push_pull_legs", "upper_lower", "bro_split"], description: "Training split style." },
      daysPerWeek: { type: "integer", minimum: 3, maximum: 6, description: "Training days per week." },
      name: { type: "string", description: "Short, clean plan name in ENGLISH ONLY (e.g. 'Push Pull Legs', 'Full Body Strength', 'Upper Lower Split'). Max 4 words. Never use Spanish. Do NOT include day counts, 'Casa', 'Gym', or version numbers — those are added automatically." },
    },
    required: ["split", "daysPerWeek"],
  },
};

/**
 * Builds the coach's context for THIS user.
 *
 * `userId` is passed in, already verified by checkAndBumpLimit. React's cache()
 * does not deduplicate inside route handlers (only inside Server Component
 * renders), so asking Supabase Auth a second time here would be a real, wasted
 * network round trip on every single message.
 */
async function loadContext(userId: string | null) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !userId) {
    return { profile: null, memory: [], memoryConsent: false, recentSessions: [], todayNutrition: undefined, userId: null, recipes: [] as string[] };
  }
  try {
    const supabase = await createClient();
    const user = { id: userId };

    const today = new Date().toISOString().slice(0, 10);
    const threeDaysAgo = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10) + "T00:00:00";
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10) + "T00:00:00";

    const [{ data: profile }, { data: mem }, { data: sessions }, { data: recentMeals }, { data: weekMeals }, { data: recipeRows }] = await Promise.all([
      supabase.from("users_profiles").select("name,gender,goal,level,training_days,session_duration_minutes,current_weight_kg,height_cm,injuries,equipment_available,age,custom_calories,custom_protein_g,custom_carbs_g,custom_fats_g").eq("user_id", user.id).maybeSingle(),
      supabase.from("coach_memory").select("content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
      supabase.from("workout_sessions").select("focus,duration_minutes,total_volume_kg,started_at").eq("user_id", user.id).order("started_at", { ascending: false }).limit(5),
      supabase.from("nutrition_logs").select("meal_name,calories,protein_g,carbs_g,fats_g,logged_at").eq("user_id", user.id).gte("logged_at", threeDaysAgo).order("logged_at", { ascending: true }),
      supabase.from("nutrition_logs").select("calories,protein_g,logged_at").eq("user_id", user.id).gte("logged_at", sevenDaysAgo),
      // Public catalogue, identical for everyone, exactly like the exercise
      // library. It holds no personal data, so nothing can cross between users.
      supabase.from("recipes").select("name,meal_type,calories,protein_g,carbs_g,fat_g,prep_minutes,cook_minutes,tags").order("meal_type"),
    ]);

    // Build a nutrition summary covering the last 3 days, computed directly from
    // the meals (no dependency on nutrition_days, which can lag or mismatch tz).
    let todayNutrition: string | undefined;
    const meals = recentMeals ?? [];
    if (meals.length > 0) {
      // Group meals by day and total them.
      const byDay = new Map<string, { cal: number; pro: number; carb: number; fat: number; names: string[] }>();
      for (const m of meals) {
        const d = String(m.logged_at).slice(0, 10);
        if (!byDay.has(d)) byDay.set(d, { cal: 0, pro: 0, carb: 0, fat: 0, names: [] });
        const e = byDay.get(d)!;
        e.cal += Number(m.calories ?? 0);
        e.pro += Number(m.protein_g ?? 0);
        e.carb += Number(m.carbs_g ?? 0);
        e.fat += Number(m.fats_g ?? 0);
        e.names.push(`${m.meal_name} (${Math.round(Number(m.calories ?? 0))}kcal, ${Math.round(Number(m.protein_g ?? 0))}g protein)`);
      }
      const dayLines: string[] = [];
      for (let i = 0; i <= 3; i++) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        const e = byDay.get(d);
        if (!e) continue;
        const label = d === today ? "Today" : d;
        dayLines.push(`${label}: ${Math.round(e.cal)} kcal, ${Math.round(e.pro)}g protein, ${Math.round(e.carb)}g carbs, ${Math.round(e.fat)}g fat — meals: ${e.names.join("; ")}`);
      }
      // 7-day averages from meals.
      const wm = weekMeals ?? [];
      const daysSet = new Set(wm.map((m) => String(m.logged_at).slice(0, 10)));
      const numDays = Math.max(1, daysSet.size);
      const totalCal = wm.reduce((s, m) => s + Number(m.calories ?? 0), 0);
      const totalPro = wm.reduce((s, m) => s + Number(m.protein_g ?? 0), 0);
      const avgCals = Math.round(totalCal / numDays);
      const avgPro = Math.round(totalPro / numDays);

      // Compare the 7-day average against the user's real daily goal (same
      // calculation as the Nutrition tab and the Calorie intake screen), so the
      // coach can talk in terms of deficit / surplus / on target with numbers.
      const goal = computeNutritionGoal((profile ?? {}) as Parameters<typeof computeNutritionGoal>[0]);
      let goalLine = "";
      if (weekMeals && weekMeals.length) {
        const diff = avgCals - goal.calories;
        const tol = goal.calories * 0.1;
        const status =
          Math.abs(diff) <= tol
            ? "on target"
            : diff < 0
            ? `a deficit of ${Math.abs(diff)} kcal/day`
            : `a surplus of ${diff} kcal/day`;
        const proGap = goal.protein_g - avgPro;
        const proNote =
          proGap > 10 ? ` Protein is ${proGap}g/day under goal.` : proGap < -10 ? ` Protein is over goal.` : ` Protein is on track.`;
        goalLine = ` | Daily goal: ${goal.calories} kcal, ${goal.protein_g}g protein${goal.personalized ? "" : " (default, profile incomplete)"}. The 7-day average is ${status}.${proNote}`;
      }

      todayNutrition =
        dayLines.join(" | ") +
        (wm.length ? ` | 7-day average: ${avgCals} kcal, ${avgPro}g protein per day (over ${numDays} logged days).` : "") +
        goalLine;
    }

    // Consent is read in its OWN query. If the column has not been created yet
    // (the SQL migration has not run), this fails quietly and consent stays
    // false, which is the safe default: no memory is read and none is written.
    // A failure here can never break the profile or the rest of the context.
    let memoryConsent = false;
    try {
      const { data: consentRow } = await supabase
        .from("users_profiles")
        .select("coach_memory_consent")
        .eq("user_id", user.id)
        .maybeSingle();
      memoryConsent = consentRow?.coach_memory_consent === true;
    } catch {
      memoryConsent = false;
    }

    return {
      userId: user.id,
      profile: profile ?? null,
      memory: memoryConsent ? (mem ?? []).map((m) => m.content) : [],
      memoryConsent,
      recentSessions: (sessions ?? []).map((s) =>
        `${s.focus ?? "Workout"} — ${s.duration_minutes ?? "?"}min, ${Math.round((s.total_volume_kg ?? 0))}kg volume`
      ),
      todayNutrition,
      recipes: (recipeRows ?? []).map(
        (r) => `${r.name} (${r.meal_type}, ${r.calories}kcal, ${r.protein_g}p/${r.carbs_g}c/${r.fat_g}f, ${(r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)}min${(r.tags ?? []).length ? ", " + (r.tags as string[]).join("/") : ""})`
      ),
    };
  } catch {
    return { profile: null, memory: [], memoryConsent: false, recentSessions: [], todayNutrition: undefined, userId: null, recipes: [] as string[] };
  }
}

async function persist(userId: string | null, conversationId: string | null, userMsg: string, reply: string, imagePath: string | null = null) {
  if (!userId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return conversationId;
  try {
    const supabase = await createClient();
    let convId = conversationId;
    if (!convId) {
      const { data } = await supabase.from("coach_conversations")
        .insert({ user_id: userId, title: userMsg.slice(0, 40) || "Photo" }).select().single();
      convId = data?.id ?? null;
    } else {
      // Verify this conversation actually belongs to the user before touching it.
      // (RLS also enforces this at the DB level; this is defense-in-depth.)
      const { data: owned } = await supabase.from("coach_conversations")
        .select("id").eq("id", convId).eq("user_id", userId).maybeSingle();
      if (!owned) {
        // Not theirs (or doesn't exist) — start a fresh conversation instead.
        const { data } = await supabase.from("coach_conversations")
          .insert({ user_id: userId, title: userMsg.slice(0, 40) || "Photo" }).select().single();
        convId = data?.id ?? null;
      } else {
        await supabase.from("coach_conversations")
          .update({ updated_at: new Date().toISOString() }).eq("id", convId).eq("user_id", userId);
      }
    }
    if (convId) {
      // Only attach image_path when there's actually an image, so a text-only
      // message still saves even if the coach_imagen_en_chat.sql migration has
      // not run yet (the column may not exist). If the insert fails *with* the
      // image key, retry once without it so the text is never lost.
      const userRow: Record<string, unknown> = { conversation_id: convId, role: "user", content: userMsg };
      if (imagePath) userRow.image_path = imagePath;
      const assistantRow = { conversation_id: convId, role: "assistant", content: reply };

      const { error } = await supabase.from("coach_messages").insert([userRow, assistantRow]);
      if (error && imagePath) {
        delete userRow.image_path;
        await supabase.from("coach_messages").insert([userRow, assistantRow]);
      }
    }
    return convId;
  } catch {
    return conversationId;
  }
}

// Extract durable facts about the user from the latest exchange and save them to
// coach_memory, so the coach genuinely learns over time. Runs quietly; failures
// never affect the user's reply.
async function learnFromExchange(userId: string | null, consent: boolean, userMsg: string, reply: string, existing: string[]) {
  // Two locks: the caller checks consent, and so do we. Memory is never written
  // for a user who did not opt in, whatever the call site does.
  if (!consent) return;
  if (!userId || !process.env.NEXT_PUBLIC_SUPABASE_URL || !hasApiKey()) return;
  // Only bother if the user's message is substantial.
  if (userMsg.trim().length < 15) return;
  try {
    const res = await callAnthropic({
      system:
        "You extract durable facts about a fitness app user from a message. Return ONLY a JSON array of short factual strings (max 5), or [] if nothing durable. " +
        "Durable = injuries, limitations, schedule constraints, food preferences/restrictions, equipment available, exercises they love or hate, their main goal or motivation. " +
        "NOT durable = one-off questions, greetings, today's mood. Keep each fact under 12 words, in the user's language. Do not duplicate these existing facts: " +
        JSON.stringify(existing.slice(0, 15)),
      messages: [{ role: "user", content: `User said: "${userMsg}"` }],
      maxTokens: 200,
    });
    const text = extractText(res.content).replace(/```json|```/g, "").trim();
    const facts = JSON.parse(text);
    if (!Array.isArray(facts) || facts.length === 0) return;
    const supabase = await createClient();
    const rows = facts
      .filter((f) => typeof f === "string" && f.trim().length > 3)
      .slice(0, 5)
      .map((content: string) => ({ user_id: userId, content: content.trim() }));
    if (rows.length) await supabase.from("coach_memory").insert(rows);
  } catch {
    // Non-critical: if extraction fails, we just don't learn this turn.
  }
}

/**
 * The recipe catalogue, for the coach.
 *
 * This is app content, not user content: the same rows for every member, with
 * no personal information in them. Giving it to the coach lets it recommend a
 * real meal with real numbers instead of inventing one and guessing the macros.
 */
function recipeBlock(recipes: string[] | undefined): string {
  if (!recipes || recipes.length === 0) return "";
  return (
    "\n\nRECIPE CATALOGUE (the app's own recipes, available to this user in the Nutrition tab):\n" +
    recipes.map((r) => `- ${r}`).join("\n") +
    "\nWhen they ask what to eat, recommend from THIS list by name and say why it fits their remaining macros. " +
    "Tell them it is in the Nutrition tab under Recipes, where the exact grams and steps are. " +
    "Never invent a recipe that is not on this list, and never invent its macros. " +
    "If nothing here fits, say so plainly and suggest what to look for instead."
  );
}

/** Pulls the text out of a user turn whose content may be a string or an array
 *  of blocks (text + image). Used for the guardrail, memory and saving. */
function extractUserText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type: "text"; text: string } =>
        !!b && typeof b === "object" && (b as { type?: string }).type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
  }
  return "";
}

const COACH_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const COACH_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Pulls the storage path of the user's own attached image out of a turn, if
 *  there is one. Used only to remember which photo went with the message so the
 *  thumbnail can be shown again on reload. Returns null unless the path lives in
 *  the caller's own folder, mirroring the ownership check in resolveImages. */
function extractUserImagePath(content: unknown, userId: string | null): string | null {
  if (!userId || !Array.isArray(content)) return null;
  for (const b of content) {
    const block = b as { type?: string; storagePath?: string };
    if (
      block?.type === "image" &&
      typeof block.storagePath === "string" &&
      block.storagePath.startsWith(`${userId}/`)
    ) {
      return block.storagePath;
    }
  }
  return null;
}

/** Validates and normalises any image blocks in the user's turns. Drops the
 *  turn's image (keeping its text) if it's the wrong type or too big, so a bad
 *  attachment can never reach Claude or blow up the request. */
/**
 * Turns image blocks that reference a storage path into real base64 image blocks
 * for Claude. The client no longer sends megabytes of base64 in the request; it
 * sends a path like "<userId>/photo.jpg", and we fetch the bytes here.
 *
 * Ownership is enforced two ways: the path must start with this user's id, and
 * the download runs through the user's own client, so Storage RLS blocks any
 * attempt to read someone else's folder. A bad or foreign path is dropped, never
 * fetched blindly.
 */
async function resolveImages(messages: AiMessage[], userId: string | null): Promise<AiMessage[]> {
  const supabase = await createClient();

  return Promise.all(
    messages.map(async (m) => {
      if (m.role !== "user" || !Array.isArray(m.content)) return m;

      const resolved = await Promise.all(
        m.content.map(async (b) => {
          const block = b as { type?: string; storagePath?: string; mediaType?: string };
          if (block.type !== "image" || !block.storagePath) return b;

          // The path must live in the caller's own folder.
          if (!userId || !block.storagePath.startsWith(`${userId}/`)) return null;

          const mt = block.mediaType ?? "image/jpeg";
          if (!COACH_IMAGE_TYPES.has(mt)) return null;

          try {
            const { data, error } = await supabase.storage.from("coach-photos").download(block.storagePath);
            if (error || !data) return null;
            const bytes = new Uint8Array(await data.arrayBuffer());
            if (bytes.byteLength > COACH_IMAGE_MAX_BYTES) return null;
            const base64 = Buffer.from(bytes).toString("base64");
            return { type: "image", source: { type: "base64", media_type: mt, data: base64 } };
          } catch {
            return null;
          }
        })
      );

      // Drop anything that failed to resolve; keep text and valid images.
      return { ...m, content: resolved.filter((b): b is NonNullable<typeof b> => b !== null) };
    })
  );
}

export async function POST(req: NextRequest) {
  // Cheap first line of defense, before any auth work. It lives in memory, so
  // on serverless it only sees the traffic that hit this instance: treat it as
  // a speed bump, not the real limit. The per-user, per-minute counter in the
  // database (checkAndBumpLimit) is the one that actually holds.
  const ip = getClientIp(req);
  const ipCheck = ipRateLimit(ip, { limit: 20, windowMs: 60_000 });
  if (!ipCheck.allowed) {
    return NextResponse.json({ reply: "You're sending messages too fast. Please wait a moment." }, { status: 429 });
  }

  if (!hasApiKey()) {
    // Never name environment variables to a user.
    return NextResponse.json({
      reply: "I can't reach my brain right now. This one is on us, and we're on it.",
    });
  }

  let body: { messages?: AiMessage[]; conversationId?: string | null; tzOffset?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }

  const rawMessages = (body.messages ?? []).slice(-12);
  const lastUser = [...rawMessages].reverse().find((m: AiMessage) => m.role === "user");
  // The last user turn may be an array (text + image). Pull the text out for the
  // guardrail, memory and persistence; images are resolved once we know the user.
  const lastText = extractUserText(lastUser?.content);

  // Guardrail
  const guard = guardUserMessage(lastText);
  if (!guard.ok && guard.reason === "blocked") {
    await logSecurityEvent(null, "coach_blocked", lastText);
    return NextResponse.json({ reply: GUARD_REPLY });
  }

  // Rate limit / plan enforcement (server-side, admin bypass by email)
  const limit = await checkAndBumpLimit("coach");
  if (!limit.allowed) {
    return NextResponse.json(
      { reply: limitReply(limit.reason), limitReached: true, retryAfter: limit.reason === "minute" ? 60 : null },
      { status: limit.reason === "minute" ? 429 : 200 }
    );
  }

  // Now that the user is verified, turn any storage-path image references into
  // real base64 blocks for Claude (and drop any that aren't the user's own).
  const messages = await resolveImages(rawMessages, limit.userId);

  // Remember which photo (if any) went with this turn, so its thumbnail can be
  // shown again when the conversation is reloaded. Pulled from the raw turn,
  // which still carries the storage path (resolveImages swaps it for base64).
  const lastImagePath = extractUserImagePath(lastUser?.content, limit.userId);

  const ctx = await loadContext(limit.userId);
  const gender = (ctx.profile as { gender?: string } | null)?.gender ?? null;
  const identity = coachIdentity(gender);
  // Build a human-readable "now" from the client's timezone offset (minutes to
  // add to UTC). Falls back to UTC if not provided.
  const tzOffset = typeof body.tzOffset === "number" ? body.tzOffset : 0;
  const localNow = new Date(Date.now() + tzOffset * 60_000);
  const nowInfo = {
    weekday: localNow.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    date: localNow.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
    time: localNow.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
  };
  // This user's own memory state, so the coach can answer honestly if asked.
  // It describes only them; nothing here comes from any other user.
  const memoryState = ctx.memoryConsent
    ? "\n\nMEMORY STATE: ON. This user allowed you to remember durable facts about them. They can review, pause or delete any of it in their Profile."
    : "\n\nMEMORY STATE: PAUSED. You are not using or adding any saved notes about this user right now. If they ask you to remember something, tell them they can switch memory back on in their Profile. Anything saved before is kept there, untouched, until they choose to delete it.";

  const system = identity.system + buildContextBlock({
    profile: ctx.profile as Record<string, unknown> | null,
    memory: ctx.memory,
    recentSessions: ctx.recentSessions,
    todayNutrition: ctx.todayNutrition,
    now: nowInfo,
  }) + memoryState + recipeBlock(ctx.recipes);

  // ---------------------------------------------------------------------
  // Streamed response.
  //
  // The client gets words as the model writes them instead of staring at a
  // spinner for three seconds. We speak newline-delimited JSON, one event per
  // line, because it is trivial to parse incrementally and needs no library:
  //   {"t":"chunk","v":"..."}   more text for the user
  //   {"t":"done", ...}         final cleaned text + metadata
  //   {"t":"error","reply":"…"} something went wrong; show this instead
  //
  // Text is streamed RAW. `stripFormatting` collapses whitespace and trims, so
  // it cannot be applied to fragments; the cleaned version travels in "done"
  // and the client swaps it in. The coach is told never to use markdown, so in
  // practice the two are identical.
  // ---------------------------------------------------------------------
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        let raw = "";
        let toolCall: { id: string; name: string; input: unknown } | null = null;

        for await (const ev of streamAnthropic({ system, messages, tools: [GENERATE_ROUTINE_TOOL, SET_NUTRITION_TOOL], maxTokens: 900 })) {
          if (ev.type === "text") {
            raw += ev.text;
            send({ t: "chunk", v: ev.text });
          } else if (ev.type === "tool_use") {
            toolCall = { id: ev.id, name: ev.name, input: ev.input };
          }
        }

        let routineSaved = false;
        let nutritionSet: { calories: number; protein_g: number; carbs_g: number; fats_g: number } | null = null;

        if (toolCall && toolCall.name === "set_nutrition_targets") {
          const input = toolCall.input as {
            calories?: number; protein_g?: number; carbs_g?: number; fats_g?: number;
          };
          const calories = clampInt(input.calories, 1000, 6000);
          if (calories && ctx.userId) {
            // Fill any macro the coach left blank, so the ring is always complete.
            const protein_g = clampInt(input.protein_g, 0, 400) ?? null;
            const carbs_g = clampInt(input.carbs_g, 0, 800) ?? null;
            const fats_g = clampInt(input.fats_g, 0, 300) ?? null;
            const supabase = await createClient();
            await supabase.from("users_profiles").update({
              custom_calories: calories,
              custom_protein_g: protein_g,
              custom_carbs_g: carbs_g,
              custom_fats_g: fats_g,
              custom_targets_set_at: new Date().toISOString(),
              custom_targets_source: "coach",
            }).eq("user_id", ctx.userId);

            nutritionSet = {
              calories,
              protein_g: protein_g ?? 0,
              carbs_g: carbs_g ?? 0,
              fats_g: fats_g ?? 0,
            };
          }

          // Let the model confirm to the user in its own words, with the tool result.
          const assistantContent: unknown[] = [];
          if (raw) assistantContent.push({ type: "text", text: raw });
          assistantContent.push({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input });
          raw = "";
          for await (const ev of streamAnthropic({
            system,
            messages: [
              ...messages,
              { role: "assistant", content: assistantContent },
              {
                role: "user",
                content: [{
                  type: "tool_result",
                  tool_use_id: toolCall.id,
                  content: JSON.stringify(
                    nutritionSet
                      ? { saved: true, ...nutritionSet, note: "Now visible in the Nutrition tab." }
                      : { saved: false, error: "Could not save the targets." }
                  ),
                }],
              },
            ],
            maxTokens: 900,
          })) {
            if (ev.type === "text") { raw += ev.text; send({ t: "chunk", v: ev.text }); }
          }
        }

        if (toolCall && toolCall.name === "generate_routine") {
          // Building a plan takes a moment; tell the UI so it can say so.
          send({ t: "status", v: "building_routine" });

          const input = toolCall.input as { split?: string; daysPerWeek?: number; name?: string };
          const split = (["full_body", "push_pull_legs", "upper_lower", "bro_split"].includes(input.split ?? "")
            ? input.split : "push_pull_legs") as Split;
          const daysPerWeek = Math.min(6, Math.max(3, input.daysPerWeek ?? (ctx.profile as { training_days?: number } | null)?.training_days ?? 4));

          const routine = await buildRoutine({
            split, daysPerWeek,
            goal: (ctx.profile as { goal?: string } | null)?.goal,
            level: (ctx.profile as { level?: string } | null)?.level,
            equipment: (ctx.profile as { equipment_available?: string[] } | null)?.equipment_available ?? [],
            name: input.name,
          });
          const saved = await saveRoutine(routine);
          routineSaved = saved.ok;

          // Rebuild the assistant turn exactly as the model produced it, so the
          // tool result lines up with the tool call it is answering.
          const assistantContent: unknown[] = [];
          if (raw) assistantContent.push({ type: "text", text: raw });
          assistantContent.push({ type: "tool_use", id: toolCall.id, name: toolCall.name, input: toolCall.input });

          raw = "";
          for await (const ev of streamAnthropic({
            system,
            messages: [
              ...messages,
              { role: "assistant", content: assistantContent },
              {
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: toolCall.id,
                    content: JSON.stringify({
                      saved: saved.ok,
                      error: saved.ok ? undefined : (saved.error === "no_exercises"
                        ? "No exercises in the library yet."
                        : "Couldn't save the plan."),
                      plan: routine.name,
                      days: routine.days.map((d) => ({
                        day: d.name, focus: d.focus,
                        exercises: d.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`),
                      })),
                    }),
                  },
                ],
              },
            ],
            maxTokens: 900,
          })) {
            if (ev.type === "text") {
              raw += ev.text;
              send({ t: "chunk", v: ev.text });
            }
          }
        }

        const reply = stripFormatting(raw || "…");
        const convId = await persist(ctx.userId, body.conversationId ?? null, lastText, reply, lastImagePath);

        send({
          t: "done",
          reply,
          conversationId: convId,
          routineSaved,
          nutritionSet,
          aiRemaining: limit.limit ? Math.max(0, limit.limit - limit.used) : null,
        });

        // Learning is a second model call: it must never delay the answer.
        if (ctx.memoryConsent) {
          after(async () => {
            await learnFromExchange(ctx.userId, ctx.memoryConsent, lastText, reply, ctx.memory);
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        console.error("coach error:", msg);

        let reply = "I'm having trouble connecting right now. Give me a moment and try again.";
        if (/ANTHROPIC_429|ANTHROPIC_529|rate_limit|overloaded|STREAM_ERROR/i.test(msg)) {
          reply = "A lot of people are training with me right now. Give me a few seconds and ask again.";
        } else if (/NO_API_KEY|ANTHROPIC_401|ANTHROPIC_404/i.test(msg)) {
          reply = "I can't reach my brain right now. This one is on us, and we're on it.";
        }
        send({ t: "error", reply });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Stops proxies from buffering the stream and defeating the whole point.
      "x-accel-buffering": "no",
    },
  });
}
