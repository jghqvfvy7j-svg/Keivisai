import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { ipRateLimit, getClientIp } from "@/lib/ai/ip-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Whisper's own cap. We reject bigger files before spending a request on them.
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB, under Whisper's 25 MB limit
const ALLOWED = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/m4a", "audio/ogg"]);

/**
 * Turns a short voice note into text, on the server.
 *
 * The audio is sent to OpenAI's Whisper here, so the OpenAI key never touches
 * the browser. Claude never sees the audio: this endpoint returns text, and the
 * client puts that text in the coach box for the user to review and send. Two
 * separate providers, one job each.
 *
 * The transcript is returned, not stored. We keep no copy of the audio.
 */
export async function POST(req: NextRequest) {
  // Cheap IP speed bump first, before any heavy work.
  const ip = getClientIp(req);
  if (!ipRateLimit(ip, { limit: 15, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });
  }

  // Must be a signed-in user. Transcription costs money; anonymous callers don't
  // get to spend it.
  const { user, failed } = await getCurrentUser();
  if (failed || !user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Never name the variable to the user.
    return NextResponse.json({ error: "Voice input isn't available right now." }, { status: 503 });
  }

  let audio: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof File) audio = f;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!audio) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "That recording is too long. Keep it under a minute or two." }, { status: 413 });
  }
  // Content type can be "audio/webm;codecs=opus" — match on the prefix.
  const baseType = audio.type.split(";")[0].trim();
  if (baseType && !ALLOWED.has(baseType)) {
    return NextResponse.json({ error: "That audio format isn't supported." }, { status: 415 });
  }

  try {
    const upstream = new FormData();
    upstream.append("file", audio, audio.name || "voice.webm");
    upstream.append("model", "whisper-1");
    // A gentle nudge; Whisper auto-detects but this steadies mixed ES/EN speech.
    upstream.append("prompt", "Fitness coaching: sets, reps, RIR, macros, protein.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      // Do not forward OpenAI's body; it can echo request details.
      const status = res.status === 429 ? 503 : 502;
      return NextResponse.json({ error: "Couldn't transcribe that. Try again." }, { status });
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "I couldn't make out any words. Try again." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Couldn't transcribe that. Try again." }, { status: 502 });
  }
}
