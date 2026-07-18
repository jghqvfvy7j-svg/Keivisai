'use client';
import { useEffect, useState } from 'react';

type State = 'standalone' | 'safari' | 'other';

const steps = [
  { n: 1, t: 'Abre esta página en Safari', d: 'Chrome u otros navegadores no permiten instalar en iPhone.' },
  { n: 2, t: 'Pulsa el botón Compartir', d: 'El cuadro con la flecha hacia arriba, en la barra inferior.' },
  { n: 3, t: 'Elige "Agregar a pantalla de inicio"', d: 'Desplázate en la lista de acciones si no lo ves.' },
  { n: 4, t: 'Confirma el nombre y pulsa "Agregar"', d: 'Puedes dejar "Keivis".' },
  { n: 5, t: 'Ábrela desde el icono nuevo', d: 'Se verá a pantalla completa, sin barras del navegador.' },
];

export function InstallGuide() {
  const [state, setState] = useState<State>('other');

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return setState('standalone');
    const ua = window.navigator.userAgent;
    const isIOSSafari = /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setState(isIOSSafari ? 'safari' : 'other');
  }, []);

  if (state === 'standalone') {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'rgb(var(--surface))' }}>
        <p className="font-medium">Ya estás usando la app instalada</p>
        <p className="mt-1 text-sm" style={{ color: 'rgb(var(--muted))' }}>
          Se está ejecutando en modo pantalla completa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state === 'other' ? (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgb(var(--cat-goal) / 0.12)', color: 'rgb(var(--text))' }}>
          Para instalar en iPhone, abre esta misma dirección en <strong>Safari</strong>.
        </div>
      ) : null}
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-2xl p-3" style={{ background: 'rgb(var(--surface))' }}>
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: 'rgb(var(--cat-work))' }}>{s.n}</span>
            <div>
              <div className="font-medium">{s.t}</div>
              <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
