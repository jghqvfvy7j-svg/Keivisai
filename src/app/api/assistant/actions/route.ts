import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTool } from '@/lib/ai/tools';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { actionId?: string; confirm?: boolean } | null;
  if (!body?.actionId) return NextResponse.json({ error: 'Falta actionId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: action } = await admin
    .from('assistant_actions')
    .select('id,action_type,payload,status,user_id')
    .eq('id', body.actionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!action) return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
  if (action.status !== 'pendiente') return NextResponse.json({ ok: true, already: true });

  if (!body.confirm) {
    await admin.from('assistant_actions').update({ status: 'cancelada' }).eq('id', action.id);
    return NextResponse.json({ ok: true, cancelled: true });
  }

  const tool = getTool(action.action_type);
  if (!tool) return NextResponse.json({ error: 'Herramienta desconocida' }, { status: 400 });

  try {
    const result = await tool.handler({ userId: user.id, supabase }, action.payload as never);
    await admin
      .from('assistant_actions')
      .update({ status: 'ejecutada', confirmed_at: new Date().toISOString() })
      .eq('id', action.id);
    await admin.from('audit_logs').insert({
      user_id: user.id,
      actor_type: 'user',
      action: `confirm.${action.action_type}`,
      after_data: action.payload as object,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al ejecutar';
    await admin.from('assistant_actions').update({ status: 'error', error_message: msg }).eq('id', action.id);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
