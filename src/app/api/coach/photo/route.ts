import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { ipRateLimit, getClientIp } from "@/lib/ai/ip-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Stores a photo the user wants to send the coach, in their own private folder
 * inside the coach-photos bucket. Returns a short-lived signed URL the coach
 * route can fetch. Keeping the image in Storage (not a blob: URL) means the
 * thumbnail survives a reload and the request body stays small.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!ipRateLimit(ip, { limit: 20, windowMs: 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many requests. Wait a moment." }, { status: 429 });
  }

  const { user, failed } = await getCurrentUser();
  if (failed || !user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("photo");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "No photo received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is too big (max 5MB)." }, { status: 413 });

  const baseType = file.type.split(";")[0].trim();
  if (!ALLOWED.has(baseType)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP or GIF image." }, { status: 415 });
  }

  try {
    const supabase = await createClient();
    const ext = baseType.split("/")[1] === "jpeg" ? "jpg" : baseType.split("/")[1];
    // Folder is the user's id, which the storage policy requires.
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("coach-photos")
      .upload(path, bytes, { contentType: baseType, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 502 });
    }

    // A signed URL that both the thumbnail and the coach route can use briefly.
    const { data: signed } = await supabase.storage
      .from("coach-photos")
      .createSignedUrl(path, 60 * 60); // 1 hour

    return NextResponse.json({ path, url: signed?.signedUrl ?? null, mediaType: baseType });
  } catch {
    return NextResponse.json({ error: "Couldn't save the photo. Try again." }, { status: 500 });
  }
}
