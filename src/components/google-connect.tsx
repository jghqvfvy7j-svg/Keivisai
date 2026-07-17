'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function GoogleConnect({ connected, email }: { connected: boolean; email: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    params.get('connected') ? 'Google Calendar conectado.' : params.get('error') ? 'No se pudo conectar. Intenta de nuevo.' : null,
  );

  async function disconnect() {
    setBusy(true);
    await fetch('/api/google/disconnect', { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  async function sync() {
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/google/sync', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Sincronizados ${data.pushed ?? 0} evento(s).` : data.error ?? 'Error al sincronizar');
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--surface))' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Google Calendar</div>
          <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
            {connected ? `Conectado${email ? ` · ${email}` : ''}` : 'No conectado'}
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: connected ? 'rgb(var(--cat-gym))' : 'rgb(var(--cat-rest))' }} />
      </div>

      {msg ? <p className="mt-2 text-sm" style={{ color: 'rgb(var(--muted))' }}>{msg}</p> : null}

      <div className="mt-3 flex gap-2">
        {connected ? (
          <>
            <button onClick={sync} disabled={busy}
              className="flex-1 rounded-xl py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'rgb(var(--cat-work))' }}>
              {busy ? '…' : 'Sincronizar ahora'}
            </button>
            <button onClick={disconnect} disabled={busy}
              className="rounded-xl border px-4 py-2 text-sm" style={{ borderColor: 'rgb(var(--border))' }}>
              Desconectar
            </button>
          </>
        ) : (
          <a href="/api/google/connect"
            className="flex-1 rounded-xl py-2 text-center text-sm font-medium text-white"
            style={{ background: 'rgb(var(--cat-work))' }}>
            Conectar Google Calendar
          </a>
        )}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'rgb(var(--muted))' }}>
        Los eventos se crean sin recordatorios ni alarmas.
      </p>
    </div>
  );
}
