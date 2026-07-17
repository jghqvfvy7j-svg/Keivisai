import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateMcpToken } from '@/lib/mcp/tokens';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const { plaintext, hash, prefix } = generateMcpToken();

  const admin = createAdminClient();
  const { error } = await admin.from('mcp_tokens').insert({
    user_id: user.id,
    name: body.name?.slice(0, 60) ?? 'ChatGPT',
    token_hash: hash,
    token_prefix: prefix,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // El secreto se devuelve UNA sola vez.
  return NextResponse.json({ token: plaintext, prefix });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('mcp_tokens')
    .select('id,name,token_prefix,created_at,last_used_at,revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return NextResponse.json({ tokens: data ?? [] });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  const admin = createAdminClient();
  await admin.from('mcp_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
