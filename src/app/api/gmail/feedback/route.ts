import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { id?: string; feedback?: string } | null;
  if (!body?.id || !['importante', 'no_importante'].includes(body.feedback ?? '')) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from('email_summaries')
    .update({
      user_feedback: body.feedback,
      requires_attention: body.feedback === 'importante',
    })
    .eq('id', body.id)
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
