import { getCurrentUser } from "@/lib/supabase/user";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The user's own coach memory. Every operation is scoped to the caller:
 * we filter by their user id AND row level security enforces the same rule at
 * the database, so one user can never read or delete another user's memory.
 */
async function requireUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { user, failed } = await getCurrentUser();
  // No session, or we could not verify one: fail closed either way.
  if (failed || !user) return null;
  return { supabase, userId: user.id };
}

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/** List what the coach remembers about the caller, plus their consent state. */
export async function GET() {
  const ctx = await requireUser();
  if (!ctx) return unauthorized();

  const [{ data: memories }, { data: profile, error: profileError }] = await Promise.all([
    ctx.supabase
      .from("coach_memory")
      .select("id,content,created_at,kind")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(100),
    ctx.supabase
      .from("users_profiles")
      .select("coach_memory_consent,coach_memory_prompted_at")
      .eq("user_id", ctx.userId)
      .maybeSingle(),
  ]);

  // If the consent columns do not exist yet (migration not run), report the safe
  // state: memory off, and already asked. That way we never show a consent card
  // that cannot be saved, and we never remember anyone by accident.
  if (profileError) {
    return NextResponse.json({ consent: false, asked: true, memories: [] });
  }

  return NextResponse.json({
    consent: profile?.coach_memory_consent === true,
    // null means we have never asked this person. The coach shows the consent
    // card once, then records their answer either way and stops asking.
    asked: profile?.coach_memory_prompted_at != null,
    memories: memories ?? [],
  });
}

const ConsentSchema = z.object({ consent: z.boolean() });

/**
 * Grant or pause consent.
 *
 * Turning memory OFF is a PAUSE, not an erase. The coach stops reading and
 * stops adding memories, but nothing is destroyed, so switching it back on
 * later picks up exactly where it left off. Erasing is a separate, deliberate
 * act: the delete button (one item, or everything).
 */
export async function PATCH(req: NextRequest) {
  const ctx = await requireUser();
  if (!ctx) return unauthorized();

  const parsed = ConsentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { consent } = parsed.data;

  const { error } = await ctx.supabase
    .from("users_profiles")
    .update({
      coach_memory_consent: consent,
      coach_memory_consent_at: consent ? new Date().toISOString() : null,
      // Either answer counts as answered: we never ask again unprompted.
      coach_memory_prompted_at: new Date().toISOString(),
    })
    .eq("user_id", ctx.userId);

  if (error) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 200 });

  return NextResponse.json({ ok: true, consent });
}

const EditSchema = z.object({
  id: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
});

/** Edit the wording of one memory. Scoped to the caller (user id + RLS). */
export async function PUT(req: NextRequest) {
  const ctx = await requireUser();
  if (!ctx) return unauthorized();

  const parsed = EditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { id, content } = parsed.data;
  const { error } = await ctx.supabase
    .from("coach_memory")
    .update({ content })
    .eq("user_id", ctx.userId)
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 200 });
  return NextResponse.json({ ok: true, id, content });
}

const DeleteSchema = z.object({ id: z.string().uuid() }).optional();

/** Delete one memory, or all of them when no id is given. */
export async function DELETE(req: NextRequest) {
  const ctx = await requireUser();
  if (!ctx) return unauthorized();

  const parsed = DeleteSchema.safeParse(await req.json().catch(() => undefined));
  const id = parsed.success ? parsed.data?.id : undefined;

  const query = ctx.supabase.from("coach_memory").delete().eq("user_id", ctx.userId);
  if (id) await query.eq("id", id);
  else await query;

  return NextResponse.json({ ok: true });
}
