import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scheduleConfirmSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = scheduleConfirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { importId, events } = parsed.data;
  const valid = events.filter((e) => new Date(e.endsAt) >= new Date(e.startsAt));
  if (valid.length === 0) return NextResponse.json({ error: 'No hay eventos válidos' }, { status: 400 });

  const rows = valid.map((e) => ({
    user_id: user.id,
    title: e.title,
    category: e.category,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    reminders_enabled: false,
    source: 'importacion' as const,
  }));

  const { data, error } = await supabase.from('calendar_events').insert(rows).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (importId) {
    await supabase
      .from('schedule_imports')
      .update({ status: 'confirmado', confirmed_at: new Date().toISOString() })
      .eq('id', importId)
      .eq('user_id', user.id);
  }

  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      user_id: user.id,
      actor_type: 'user',
      action: 'schedule.import_confirm',
      entity_type: 'schedule_import',
      after_data: { count: rows.length } as object,
    });
  } catch {
    /* auditoría best-effort */
  }

  return NextResponse.json({ ok: true, created: data?.length ?? 0 });
}
