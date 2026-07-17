/**
 * Cola de sincronización offline: lógica pura e independiente del almacenamiento.
 * El navegador usa un `QueueStore` respaldado por IndexedDB; las pruebas usan uno
 * en memoria. La idempotencia real la garantiza `dedupeKey` en el servidor.
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: unknown;
  createdAt: number;
  attempts: number;
}

export interface QueueStore {
  add(req: QueuedRequest): Promise<void>;
  all(): Promise<QueuedRequest[]>;
  remove(id: string): Promise<void>;
  update(req: QueuedRequest): Promise<void>;
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

/** Store en memoria (para pruebas y como respaldo). */
export function createMemoryStore(): QueueStore {
  const items = new Map<string, QueuedRequest>();
  return {
    async add(req) {
      items.set(req.id, req);
    },
    async all() {
      return [...items.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
    async remove(id) {
      items.delete(id);
    },
    async update(req) {
      items.set(req.id, req);
    },
  };
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function enqueue(
  store: QueueStore,
  req: { url: string; method: string; body: unknown },
): Promise<QueuedRequest> {
  const item: QueuedRequest = {
    id: genId(),
    url: req.url,
    method: req.method,
    body: req.body,
    createdAt: Date.now(),
    attempts: 0,
  };
  await store.add(item);
  return item;
}

/**
 * Intenta enviar todo lo encolado.
 * - 2xx: éxito, se elimina.
 * - 4xx (excepto 401): dato inválido o duplicado ya resuelto en servidor => se elimina.
 * - 401: sesión expirada (transitorio) => se conserva para reintentar.
 * - Error de red o 5xx: se conserva e incrementa `attempts` hasta `maxAttempts`.
 */
export async function flushQueue(
  store: QueueStore,
  fetchImpl: typeof fetch = fetch,
  maxAttempts = 6,
): Promise<FlushResult> {
  const items = await store.all();
  let sent = 0;
  let failed = 0;

  for (const it of items) {
    try {
      const res = await fetchImpl(it.url, {
        method: it.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(it.body),
      });
      if (res.ok) {
        await store.remove(it.id);
        sent++;
      } else if (res.status === 401) {
        await bump(store, it, maxAttempts, () => failed++);
      } else if (res.status >= 400 && res.status < 500) {
        await store.remove(it.id);
        failed++;
      } else {
        await bump(store, it, maxAttempts, () => failed++);
      }
    } catch {
      await bump(store, it, maxAttempts, () => failed++);
    }
  }

  const remaining = (await store.all()).length;
  return { sent, failed, remaining };
}

async function bump(
  store: QueueStore,
  it: QueuedRequest,
  maxAttempts: number,
  onDrop: () => void,
) {
  const next = { ...it, attempts: it.attempts + 1 };
  if (next.attempts >= maxAttempts) {
    await store.remove(it.id);
    onDrop();
  } else {
    await store.update(next);
  }
}
