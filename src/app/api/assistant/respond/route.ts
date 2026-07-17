import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildContext } from '@/lib/ai/context';
import { systemPrompt } from '@/lib/ai/prompt';
import { createOpenAiClient } from '@/lib/ai/openai';
import { runAssistant, type TranscriptItem } from '@/lib/ai/orchestrator';
import { getTool, requiresConfirmation, toolDefsForOpenAI, validateToolArgs } from '@/lib/ai/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const rl = checkRateLimit(`assistant:${user.id}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });


  const body = (await req.json().catch(() => null)) as { conversationId?: string; message?: string } | null;
  const message = body?.message?.trim();
  if (!message) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });

  const admin = createAdminClient();

  // Conversación. Si el cliente envía un id, verificar propiedad ANTES de usarlo
  // (el service_role omite RLS, así que la autorización debe ser explícita).
  let conversationId = body?.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await admin
      .from('assistant_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!conv) {
      return NextResponse.json(
        { error: 'Conversación no encontrada o no autorizada' },
        { status: 403 },
      );
    }
  } else {
    const { data } = await admin
      .from('assistant_conversations')
      .insert({ user_id: user.id, title: message.slice(0, 60) })
      .select('id')
      .single();
    conversationId = data?.id ?? null;
  }
  if (!conversationId) return NextResponse.json({ error: 'No se pudo crear la conversación' }, { status: 500 });

  await admin.from('assistant_messages').insert({
    user_id: user.id,
    conversation_id: conversationId,
    role: 'user',
    content: message,
  });

  const { data: hist } = await admin
    .from('assistant_messages')
    .select('role,content')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at')
    .limit(20);

  const context = await buildContext(supabase, user.id);
  const transcript: TranscriptItem[] = [{ type: 'message', role: 'system', text: systemPrompt(context) }];
  for (const h of hist ?? []) {
    if ((h.role === 'user' || h.role === 'assistant') && h.content) {
      transcript.push({ type: 'message', role: h.role, text: h.content });
    }
  }

  const ctx = { userId: user.id, supabase };
  try {
    const llm = createOpenAiClient();
    const result = await runAssistant(transcript, {
      llm,
      tools: toolDefsForOpenAI(),
      validate: validateToolArgs,
      needsConfirmation: requiresConfirmation,
      execute: (name, args) => {
        const tool = getTool(name);
        if (!tool) throw new Error(`Herramienta desconocida: ${name}`);
        return tool.handler(ctx, args as never);
      },
    });

    if (result.text) {
      await admin.from('assistant_messages').insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: 'assistant',
        content: result.text,
      });
    }

    for (const ex of result.executed) {
      await admin.from('audit_logs').insert({
        user_id: user.id,
        actor_type: 'assistant',
        action: `tool.${ex.name}`,
        after_data: ex.args as object,
      });
    }

    const pending: { id: string; name: string; args: unknown }[] = [];
    for (const p of result.pending) {
      const { data } = await admin
        .from('assistant_actions')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          action_type: p.name,
          payload: p.args as object,
          confirmation_required: true,
          status: 'pendiente',
        })
        .select('id')
        .single();
      if (data) pending.push({ id: data.id, name: p.name, args: p.args });
    }

    return NextResponse.json({
      conversationId,
      text: result.text,
      executed: result.executed.map((e) => ({ name: e.name })),
      pending,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error del asistente';
    return NextResponse.json({ error: msg, conversationId }, { status: 502 });
  }
}
