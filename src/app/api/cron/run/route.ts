import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerEnv } from '@/env';
import { runAutomationsForUser } from '@/lib/automations/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const env = getServerEnv();
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profiles } = await admin.from('profiles').select('id');
  let ok = 0;
  const errors: string[] = [];
  for (const p of profiles ?? []) {
    try {
      await runAutomationsForUser(admin, p.id);
      ok++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'error');
    }
  }
  return NextResponse.json({ ok: true, users: ok, errors });
}
