// Lightweight IP-based rate limiting as a first line of defense (before auth).
// Uses an in-memory sliding window. Note: in serverless this is per-instance,
// so it's a soft guard, not a hard guarantee — combine with the per-user limit
// (which is authoritative). For a hard global limit, back this with Vercel KV.

type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

// Clean old entries occasionally to avoid unbounded growth.
function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
}

export function ipRateLimit(ip: string, opts?: { limit?: number; windowMs?: number }): {
  allowed: boolean;
  remaining: number;
} {
  const limit = opts?.limit ?? 30;
  const windowMs = opts?.windowMs ?? 60_000; // 30 requests/minute default
  const now = Date.now();
  sweep(now);

  const hit = store.get(ip);
  if (!hit || hit.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  hit.count++;
  if (hit.count > limit) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: limit - hit.count };
}

// Extract the client IP from standard proxy headers (Vercel sets these).
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
