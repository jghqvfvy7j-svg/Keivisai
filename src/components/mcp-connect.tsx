'use client';
import { useEffect, useState } from 'react';

interface Token {
  id: string;
  name: string | null;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-US', { day: 'numeric', month: 'short' }).format(new Date(iso)) : '—';

export function McpConnect() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('ChatGPT');
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(`${window.location.origin}/api/mcp`);
    void load();
  }, []);

  async function load() {
    const res = await fetch('/api/mcp/tokens');
    const data = await res.json().catch(() => ({ tokens: [] }));
    setTokens(data.tokens ?? []);
  }

  async function generate() {
    setBusy(true);
    setFresh(null);
    const res = await fetch('/api/mcp/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.token) setFresh(data.token);
    void load();
  }

  async function revoke(id: string) {
    if (!confirm('¿Revocar este token? ChatGPT dejará de tener acceso.')) return;
    await fetch(`/api/mcp/tokens?id=${id}`, { method: 'DELETE' });
    void load();
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--surface))' }}>
      <div className="font-medium">Conector ChatGPT (MCP)</div>
      <p className="mt-0.5 text-xs" style={{ color: 'rgb(var(--muted))' }}>
        URL del servidor: <span className="break-all">{url}</span>
      </p>

      <div className="mt-3 flex gap-2">
        <input className="flex-1 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--bg))' }}
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del token" />
        <button onClick={generate} disabled={busy}
          className="rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: 'rgb(var(--cat-work))' }}>
          {busy ? '…' : 'Generar'}
        </button>
      </div>

      {fresh ? (
        <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: 'rgb(var(--cat-goal) / 0.12)' }}>
          Copia este token ahora, no se volverá a mostrar:
          <div className="mt-1 break-all font-mono" style={{ color: 'rgb(var(--text))' }}>{fresh}</div>
        </div>
      ) : null}

      {tokens.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{t.name || 'token'}</span>{' '}
                <span className="font-mono text-xs" style={{ color: 'rgb(var(--muted))' }}>{t.token_prefix}…</span>
                <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  creado {fmt(t.created_at)} · usado {fmt(t.last_used_at)}
                  {t.revoked_at ? ' · revocado' : ''}
                </div>
              </div>
              {!t.revoked_at ? (
                <button onClick={() => revoke(t.id)} className="text-xs" style={{ color: 'rgb(var(--cat-delivery))' }}>Revocar</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs" style={{ color: 'rgb(var(--muted))' }}>
        Sólo herramientas de lectura y registro; las acciones destructivas no se exponen. Guía en docs/MCP.md.
      </p>
    </div>
  );
}
