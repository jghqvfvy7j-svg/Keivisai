'use client';
import { useEffect, useState } from 'react';
import { flushOfflineQueue } from '@/lib/offline/submit';

export function PwaClient() {
  const [online, setOnline] = useState(true);
  const [updateReady, setUpdateReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [synced, setSynced] = useState<number | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = async () => {
      setOnline(true);
      try {
        const r = await flushOfflineQueue();
        if (r.sent > 0) {
          setSynced(r.sent);
          setTimeout(() => setSynced(null), 4000);
        }
      } catch {
        /* reintenta luego */
      }
    };
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    // Vaciar cola pendiente al abrir, si hay conexión.
    if (navigator.onLine) void flushOfflineQueue().catch(() => {});

    // Registro del service worker (solo en producción).
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        if (reg.waiting) {
          setWaiting(reg.waiting);
          setUpdateReady(true);
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(reg.waiting);
              setUpdateReady(true);
            }
          });
        });
      });

      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    }

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  function applyUpdate() {
    waiting?.postMessage({ type: 'SKIP_WAITING' });
    setUpdateReady(false);
  }

  return (
    <>
      {!online ? (
        <div className="fixed inset-x-0 top-0 z-50 px-4 py-2 text-center text-sm text-white"
          style={{ background: 'rgb(var(--cat-rest))', paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
          role="status" aria-live="polite">
          Sin conexión · los registros se sincronizarán al volver
        </div>
      ) : null}

      {synced != null ? (
        <div className="fixed inset-x-0 top-0 z-50 px-4 py-2 text-center text-sm text-white"
          style={{ background: 'rgb(var(--cat-gym))', paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
          role="status" aria-live="polite">
          {synced} registro(s) sincronizado(s)
        </div>
      ) : null}

      {updateReady ? (
        <div className="fixed inset-x-0 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-white"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)', background: 'rgb(var(--cat-work))' }}
          role="status">
          <span>Nueva versión disponible</span>
          <button onClick={applyUpdate} className="rounded-lg bg-white/20 px-3 py-1 font-medium">
            Actualizar
          </button>
        </div>
      ) : null}
    </>
  );
}
