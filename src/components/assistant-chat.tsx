'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'note';
  content: string;
}

interface Pending {
  id: string;
  name: string;
  args: unknown;
}

const ACTION_LABEL: Record<string, string> = {
  delete_calendar_event: 'Eliminar un evento del calendario',
  delete_delivery_session: 'Eliminar una sesión de delivery',
};

const SUGGESTIONS = [
  '¿Cuánto gané esta semana?',
  'Hoy hice 3 horas, gané 87.35 y recorrí 54.2 millas',
  '¿Qué tengo hoy?',
  '¿Cómo van mis metas?',
];

export function AssistantChat({
  initialConversationId,
  initialMessages,
}: {
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [convId, setConvId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error del asistente');
      if (data.conversationId) setConvId(data.conversationId);
      if (data.text) setMessages((m) => [...m, { role: 'assistant', content: data.text }]);
      if (Array.isArray(data.pending) && data.pending.length) {
        setPending((p) => [...p, ...data.pending]);
      }
      router.refresh();
    } catch (e) {
      setMessages((m) => [...m, { role: 'note', content: e instanceof Error ? e.message : 'Error' }]);
    } finally {
      setLoading(false);
    }
  }

  async function resolve(action: Pending, confirm: boolean) {
    setPending((p) => p.filter((x) => x.id !== action.id));
    const res = await fetch('/api/assistant/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: action.id, confirm }),
    });
    const data = await res.json().catch(() => ({}));
    const label = ACTION_LABEL[action.name] ?? action.name;
    setMessages((m) => [
      ...m,
      {
        role: 'note',
        content: confirm
          ? res.ok
            ? `Hecho: ${label.toLowerCase()}.`
            : `No se pudo: ${data.error ?? 'error'}.`
          : `Cancelado: ${label.toLowerCase()}.`,
      },
    ]);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="rounded-2xl p-6 text-center text-sm" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
          Escríbeme en lenguaje natural. Puedo registrar tu delivery, consultar tu semana,
          crear metas o eventos, y más.
        </div>
      ) : null}

      <ul className="space-y-2">
        {messages.map((m, i) => {
          if (m.role === 'note') {
            return (
              <li key={i} className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>{m.content}</li>
            );
          }
          const me = m.role === 'user';
          return (
            <li key={i} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm"
                style={
                  me
                    ? { background: 'rgb(var(--cat-work))', color: '#fff' }
                    : { background: 'rgb(var(--surface))' }
                }
              >
                {m.content}
              </div>
            </li>
          );
        })}
      </ul>

      {pending.map((p) => (
        <div key={p.id} className="rounded-2xl border p-3" style={{ borderColor: 'rgb(var(--cat-delivery))', background: 'rgb(var(--surface))' }}>
          <div className="text-sm font-medium">Confirmar acción</div>
          <div className="mt-0.5 text-sm">{ACTION_LABEL[p.name] ?? p.name}</div>
          <pre className="mt-1 overflow-x-auto rounded-lg p-2 text-xs" style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--muted))' }}>
            {JSON.stringify(p.args, null, 2)}
          </pre>
          <div className="mt-2 flex gap-2">
            <button onClick={() => resolve(p, true)} className="flex-1 rounded-lg py-2 text-sm font-medium text-white" style={{ background: 'rgb(var(--cat-delivery))' }}>Confirmar</button>
            <button onClick={() => resolve(p, false)} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: 'rgb(var(--border))' }}>Cancelar</button>
          </div>
        </div>
      ))}

      {loading ? <div className="text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>Pensando…</div> : null}

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}>{s}</button>
          ))}
        </div>
      ) : null}

      <div className="sticky bottom-20 flex gap-2">
        <input
          className="flex-1 rounded-xl border px-4 py-3"
          style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}
          placeholder="Escribe un mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          className="rounded-xl px-4 font-medium text-white disabled:opacity-60" style={{ background: 'rgb(var(--cat-work))' }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
