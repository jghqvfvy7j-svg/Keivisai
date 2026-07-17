import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { GoogleConnect } from '@/components/google-connect';
import { GmailConnect } from '@/components/gmail-connect';
import { McpConnect } from '@/components/mcp-connect';

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: status } = await supabase.rpc('get_integration_status');
  type IntStatus = { provider: string; account_email: string | null; status: string; last_sync_at: string | null };
  const gcal = (status ?? []).find((s: IntStatus) => s.provider === 'google_calendar') as IntStatus | undefined;
  const gmail = (status ?? []).find((s: IntStatus) => s.provider === 'gmail') as IntStatus | undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
      </header>
      <section aria-labelledby="int">
        <h2 id="int" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>
          Integraciones
        </h2>
        <Suspense fallback={null}>
          <div className="space-y-3">
            <GoogleConnect connected={gcal?.status === 'conectado'} email={gcal?.account_email ?? null} />
            <GmailConnect connected={gmail?.status === 'conectado'} email={gmail?.account_email ?? null} />
            <McpConnect />
          </div>
        </Suspense>
      </section>
      <section aria-labelledby="mas">
        <h2 id="mas" className="mb-2 text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>Más</h2>
        <div className="space-y-2">
          <a href="/actividad" className="block rounded-2xl p-3 text-sm font-medium" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--cat-work))' }}>Centro de actividad</a>
          <a href="/correos" className="block rounded-2xl p-3 text-sm font-medium" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--cat-work))' }}>Correos importantes</a>
        </div>
      </section>
    </div>
  );
}
