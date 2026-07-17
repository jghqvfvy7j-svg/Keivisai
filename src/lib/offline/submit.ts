'use client';
import { enqueue, flushQueue } from './queue';
import { idbQueueStore } from './idb';

/**
 * Envía un POST; si no hay conexión o falla la red, lo encola en IndexedDB para
 * sincronizar más tarde. Devuelve si quedó encolado.
 */
export async function submitOrQueue(
  url: string,
  body: unknown,
): Promise<{ queued: boolean; ok: boolean }> {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!online) {
    await enqueue(idbQueueStore, { url, method: 'POST', body });
    return { queued: true, ok: false };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status >= 500) {
      await enqueue(idbQueueStore, { url, method: 'POST', body });
      return { queued: true, ok: false };
    }
    return { queued: false, ok: res.ok };
  } catch {
    await enqueue(idbQueueStore, { url, method: 'POST', body });
    return { queued: true, ok: false };
  }
}

export async function flushOfflineQueue() {
  return flushQueue(idbQueueStore);
}

export async function pendingCount(): Promise<number> {
  return (await idbQueueStore.all()).length;
}
