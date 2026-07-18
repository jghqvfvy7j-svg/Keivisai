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
      <div className="mb-8">
        <div className="eyebrow">Keivis Assistant</div>
        <h1 className="mt-1">Entrar</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgb(var(--muted))' }}>
          Tu panel de turnos, ingresos y metas.
        </p>
      </div>
      <div className="space-y-3">
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm" style={{ color: 'rgb(var(--danger))' }}>
            {error}
          </p>
        ) : null}
        <button onClick={onSubmit} disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="pt-1 text-center text-sm" style={{ color: 'rgb(var(--muted))' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" style={{ color: 'rgb(var(--accent))' }}>Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
