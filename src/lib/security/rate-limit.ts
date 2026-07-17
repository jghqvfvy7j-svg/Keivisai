/**
 * Rate limiting de ventana fija (puro y probado).
 * En memoria por instancia: suficiente para proteger de ráfagas. Para producción
 * multi-instancia, usar un store compartido (p. ej. Upstash Redis) con la misma API.
 */
export interface RateLimitStore {
  get(key: string): { count: number; resetAt: number } | undefined;
  set(key: string, value: { count: number; resetAt: number }): void;
}

export function createMemoryStore(): RateLimitStore {
  const m = new Map<string, { count: number; resetAt: number }>();
  return { get: (k) => m.get(k), set: (k, v) => void m.set(k, v) };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  store: RateLimitStore,
  key: string,
  opts: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  const now = opts.now ?? Date.now();
  const cur = store.get(key);
  if (!cur || now >= cur.resetAt) {
    const resetAt = now + opts.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }
  if (cur.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetAt: cur.resetAt };
  }
  cur.count += 1;
  store.set(key, cur);
  return { allowed: true, remaining: opts.limit - cur.count, resetAt: cur.resetAt };
}

const globalStore = createMemoryStore();

/** Helper para usar en route handlers. Devuelve allowed=false si se supera el límite. */
export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  return rateLimit(globalStore, key, { limit, windowMs });
}
