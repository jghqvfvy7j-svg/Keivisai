'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push('/inicio');
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <p className="mb-6 text-sm" style={{ color: 'rgb(var(--muted))' }}>
        Keivis Assistant
      </p>
      <div className="space-y-3">
        <input
          className="w-full rounded-xl border px-4 py-3"
          style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border px-4 py-3"
          style={{ borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' }}
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm" style={{ color: 'rgb(var(--cat-delivery))' }}>
            {error}
          </p>
        ) : null}
        <button
          onClick={onSubmit}
          disabled={loading}
          className="min-h-[48px] w-full rounded-xl font-medium text-white disabled:opacity-60"
          style={{ background: 'rgb(var(--cat-work))' }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="text-center text-sm" style={{ color: 'rgb(var(--muted))' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" style={{ color: 'rgb(var(--cat-work))' }}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
