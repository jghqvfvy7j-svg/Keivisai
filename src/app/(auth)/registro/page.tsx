'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegistroPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    setMsg('Cuenta creada. Revisa tu correo si la verificación está activada, luego entra.');
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mb-6 text-sm" style={{ color: 'rgb(var(--muted))' }}>Keivis Assistant</p>
      <div className="space-y-3">
        <input
          className="input"
          type="email" inputMode="email" autoComplete="email" placeholder="Correo"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password" autoComplete="new-password" placeholder="Contraseña (mín. 6)"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p role="alert" className="text-sm" style={{ color: 'rgb(var(--danger))' }}>{error}</p> : null}
        {msg ? <p className="text-sm" style={{ color: 'rgb(var(--cat-gym))' }}>{msg}</p> : null}
        <button
          onClick={onSubmit} disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="text-center text-sm" style={{ color: 'rgb(var(--muted))' }}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'rgb(var(--accent))' }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
