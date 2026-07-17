import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getValidGmailAccess } from '@/lib/integrations/gmail-tokens';
import { getMessage, listRecentMessageIds, parseGmailMessage } from '@/lib/integrations/gmail';
import { classifyEmail, type UserRule } from '@/lib/email/classify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const rl = checkRateLimit(`gmail-sync:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });


  const admin = createAdminClient();
  const accessToken = await getValidGmailAccess(admin, user.id);
  if (!accessToken) return NextResponse.json({ error: 'Gmail no está conectado' }, { status: 400 });

  // Reglas aprendidas del feedback previo del usuario (por dominio del remitente).
  const { data: fb } = await admin
    .from('email_summaries')
    .select('sender,user_feedback')
    .eq('user_id', user.id)
    .not('user_feedback', 'is', null);
  const userRules: UserRule[] = (fb ?? [])
    .map((r) => {
      const domain = (r.sender ?? '').toLowerCase().match(/@([a-z0-9.-]+)/)?.[1];
      if (!domain) return null;
      return { match: domain, important: r.user_feedback === 'importante' };
    })
    .filter(Boolean) as UserRule[];

  let processed = 0;
  let important = 0;
  try {
    const ids = await listRecentMessageIds({ accessToken, maxResults: 20 });
    for (const id of ids) {
      const raw = await getMessage({ accessToken, id });
      const p = parseGmailMessage(raw);
      const c = classifyEmail({ sender: p.sender, subject: p.subject, snippet: p.snippet }, userRules);
      if (c.requiresAttention) important++;
      await admin.from('email_summaries').upsert(
        {
          user_id: user.id,
          gmail_message_id: p.id,
          sender: p.sender,
          subject: p.subject,
          received_at: p.receivedAt,
          snippet: p.snippet,
          classification: c.classification,
          importance_score: c.importanceScore,
          requires_attention: c.requiresAttention,
        },
        { onConflict: 'user_id,gmail_message_id' },
      );
      processed++;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de Gmail' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, processed, important });
}
