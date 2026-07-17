'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunNowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    await fetch('/api/automations/run', { method: 'POST' });
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={run} disabled={busy}
      className="rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      style={{ background: 'rgb(var(--cat-work))' }}>
      {busy ? '…' : 'Ejecutar ahora'}
    </button>
  );
}
