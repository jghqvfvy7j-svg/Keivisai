import { NextResponse } from "next/server";
import { callAnthropic, extractText, hasApiKey } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quick diagnostic: visit /api/coach/health to check if the AI is reachable.
// Returns the real error so you can see exactly what's wrong (key, model, etc).
export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ ok: false, reason: "no_api_key", hint: "Set ANTHROPIC_API_KEY in Vercel." });
  }
  try {
    const res = await callAnthropic({
      system: "You are a health check. Reply with the single word: OK.",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 10,
    });
    const text = extractText(res.content);
    return NextResponse.json({ ok: true, model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8", reply: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, reason: msg.slice(0, 200) });
  }
}
