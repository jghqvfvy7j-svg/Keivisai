import { NextRequest, NextResponse } from "next/server";
import { callAnthropic, extractText, hasApiKey } from "@/lib/ai/anthropic";
import { checkAndBumpLimit } from "@/lib/ai/limits";
import { ipRateLimit, getClientIp } from "@/lib/ai/ip-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are an expert nutrition analyst that looks at a PHOTO of a meal and identifies everything on the plate.

Carefully scan the ENTIRE image. Identify every distinct food and drink you can see — the main protein, the carbs (rice, bread, pasta, potato), vegetables, sauces, toppings, sides, and any drink. Don't miss items at the edges or partially hidden. Be specific (e.g. "grilled chicken breast", not just "meat"; "white rice", not just "grain").

Then estimate the nutrition for the whole plate.

Return ONLY valid JSON, no prose, no markdown fences:
{
  "meal_name": "short descriptive name of the dish",
  "description": "one natural sentence describing what's on the plate, e.g. 'Grilled chicken with white rice, black beans and a side salad'",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "confidence": "low" | "medium" | "high",
  "items": [{ "food": "specific food name", "qty": "estimated portion", "calories": number }],
  "assumptions": "one short sentence on portion assumptions you made",
  "is_food": true | false
}

Rules:
- List EVERY identifiable item in "items" — aim to capture the whole plate, not just the main dish.
- Be specific with food names so the user recognizes their meal.
- Photos can't reveal exact portion sizes or hidden oils/sauces, so be honest: use "medium" or "low" confidence unless the portion is very clear (e.g. a labeled package).
- Estimate realistic standard portions based on visual cues (plate size, hand/utensil references).
- Round to whole numbers.
- If the image is NOT food, set is_food false, calories 0, confidence "low".
- Never claim precision you don't have.`;

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!ipRateLimit(ip, { limit: 10, windowMs: 60000 }).allowed) {
    return NextResponse.json({ error: "rate_limited", message: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  if (!hasApiKey()) {
    return NextResponse.json({ error: "no_api_key", message: "AI photo needs ANTHROPIC_API_KEY set in Vercel." }, { status: 200 });
  }

  let body: { imageBase64?: string; mediaType?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const { imageBase64, mediaType } = body;
  if (!imageBase64) return NextResponse.json({ error: "no_image" }, { status: 400 });
  if (!mediaType || !ALLOWED.includes(mediaType)) {
    return NextResponse.json({ error: "bad_type", message: "Use a JPEG, PNG or WEBP image." }, { status: 200 });
  }
  // rough size check on the base64 payload
  if (imageBase64.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", message: "Image is too large (max 5MB)." }, { status: 200 });
  }

  // Photo analysis costs more, so it counts against the nutrition limit.
  const limit = await checkAndBumpLimit("nutrition");
  if (!limit.allowed) {
    return NextResponse.json({ error: "limit_reached", message: "Daily nutrition limit reached. Upgrade to Pro for more." }, { status: 200 });
  }

  try {
    const res = await callAnthropic({
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: "Analyze this meal photo and estimate its nutrition as JSON." },
          ],
        },
      ],
      maxTokens: 700,
    });
    const raw = extractText(res.content).replace(/```json|```/g, "").trim();
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, estimate: data });
  } catch (err) {
    console.error("nutrition photo error:", err);
    return NextResponse.json({ error: "estimate_failed" }, { status: 200 });
  }
}
