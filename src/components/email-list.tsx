'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface EmailRow {
  id: string;
  sender: string;
  subject: string;
  received_at: string | null;
  snippet: string | null;
  classification: string | null;
  requires_attention: boolean;
  user_feedback: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-US', { timeZone: 'America/New_York', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '';

export function EmailList({ emails }: { emails: EmailRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function feedback(id: string, value: 'importante' | 'no_importante') {
    setBusy(id);
    await fetch('/api/gmail/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, feedback: value }),
    });
    setBusy(null);
    router.refresh();
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
        No hay correos aún. Conecta Gmail en <a href="/ajustes" style={{ color: 'rgb(var(--cat-work))' }}>Ajustes</a> y pulsa "Revisar correos".
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {emails.map((e) => (
        <li key={e.id} className="rounded-2xl p-3" style={{ background: 'rgb(var(--surface))' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{e.subject || '(sin asunto)'}</div>
              <div className="truncate text-xs" style={{ color: 'rgb(var(--muted))' }}>{e.sender}</div>
            </div>
            <div className="flex flex-none items-center gap-1">
              {e.requires_attention ? (
                <span className="h-2 w-2 rounded-full" style={{ background: 'rgb(var(--cat-delivery))' }} aria-label="importante" />
              ) : null}
              <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{fmt(e.received_at)}</span>
            </div>
          </div>
          {e.snippet ? <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'rgb(var(--muted))' }}>{e.snippet}</p> : null}
          <div className="mt-2 flex items-center gap-2">
            {e.classification ? (
              <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--muted))' }}>{e.classification}</span>
            ) : null}
            <div className="ml-auto flex gap-2">
              <button onClick={() => feedback(e.id, 'importante')} disabled={busy === e.id}
                className="rounded-lg px-2 py-1 text-xs" style={{ background: 'rgb(var(--cat-gym) / 0.15)', color: 'rgb(var(--cat-gym))' }}>Importante</button>
              <button onClick={() => feedback(e.id, 'no_importante')} disabled={busy === e.id}
                className="rounded-lg px-2 py-1 text-xs" style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--muted))' }}>No</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
