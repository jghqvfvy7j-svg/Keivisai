import { NextRequest, NextResponse } from "next/server";
import { callAnthropic, extractText, hasApiKey } from "@/lib/ai/anthropic";
import { guardUserMessage } from "@/lib/ai/guard";
import { checkAndBumpLimit, logSecurityEvent } from "@/lib/ai/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are a nutrition estimator. Given a free-text description of a meal (any language), estimate its nutrition.

Return ONLY valid JSON, no prose, no markdown fences:
{
  "meal_name": "short clean name",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "confidence": "low" | "medium" | "high",
  "items": [{ "food": "string", "qty": "string", "calories": number }]
}

Rules:
- Be realistic. Use standard portion sizes when quantity isn't given.
- Round to whole numbers.
- confidence: "high" if quantities are clear, "low" if very vague.
- If the input isn't food, return calories 0 and confidence "low".`;

export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "no_api_key", message: "AI nutrition needs ANTHROPIC_API_KEY set in Vercel." }, { status: 200 });
  }
  let body: { text?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const guard = guardUserMessage(text);
  if (!guard.ok && guard.reason === "blocked") {
    await logSecurityEvent(null, "nutrition_blocked", text);
    return NextResponse.json({ error: "blocked" }, { status: 200 });
  }

  const limit = await checkAndBumpLimit("nutrition");
  if (!limit.allowed) {
    return NextResponse.json({ error: "limit_reached", message: "Daily nutrition estimate limit reached. Upgrade to Pro for more." }, { status: 200 });
  }

  try {
    const res = await callAnthropic({
      system: SYSTEM,
      messages: [{ role: "user", content: `Estimate the nutrition for: ${text}` }],
      maxTokens: 500,
    });
    const raw = extractText(res.content).replace(/```json|```/g, "").trim();
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, estimate: data });
  } catch (err) {
    console.error("nutrition estimate error:", err);
    return NextResponse.json({ error: "estimate_failed" }, { status: 200 });
  }
}
