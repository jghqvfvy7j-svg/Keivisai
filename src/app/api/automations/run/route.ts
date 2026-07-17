import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runAutomationsForUser } from '@/lib/automations/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const rl = checkRateLimit(`automations:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });


  const admin = createAdminClient();
  try {
    const summary = await runAutomationsForUser(admin, user.id);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
