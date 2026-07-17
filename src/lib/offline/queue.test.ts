import { describe, expect, it, vi } from 'vitest';
import { createMemoryStore, enqueue, flushQueue } from './queue';

function res(status: number) {
  return { ok: status >= 200 && status < 300, status } as Response;
}

describe('cola offline', () => {
  it('encola y envía con éxito (2xx) => se vacía', async () => {
    const store = createMemoryStore();
    await enqueue(store, { url: '/api/x', method: 'POST', body: { a: 1 } });
    await enqueue(store, { url: '/api/x', method: 'POST', body: { a: 2 } });
    const fetchImpl = vi.fn(async () => res(201));

    const r = await flushQueue(store, fetchImpl as unknown as typeof fetch);
    expect(r.sent).toBe(2);
    expect(r.remaining).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('error de red => conserva e incrementa intentos', async () => {
    const store = createMemoryStore();
    await enqueue(store, { url: '/api/x', method: 'POST', body: {} });
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });

    const r = await flushQueue(store, fetchImpl as unknown as typeof fetch);
    expect(r.sent).toBe(0);
    expect(r.remaining).toBe(1);
    const [item] = await store.all();
    expect(item.attempts).toBe(1);
  });

  it('4xx (dato inválido) => se descarta', async () => {
    const store = createMemoryStore();
    await enqueue(store, { url: '/api/x', method: 'POST', body: {} });
    const fetchImpl = vi.fn(async () => res(400));

    const r = await flushQueue(store, fetchImpl as unknown as typeof fetch);
    expect(r.failed).toBe(1);
    expect(r.remaining).toBe(0);
  });

  it('401 (sesión expirada) => se conserva para reintentar', async () => {
    const store = createMemoryStore();
    await enqueue(store, { url: '/api/x', method: 'POST', body: {} });
    const fetchImpl = vi.fn(async () => res(401));

    const r = await flushQueue(store, fetchImpl as unknown as typeof fetch);
    expect(r.remaining).toBe(1);
  });

  it('descarta tras superar el máximo de intentos', async () => {
    const store = createMemoryStore();
    await enqueue(store, { url: '/api/x', method: 'POST', body: {} });
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });

    // maxAttempts = 2: primer flush -> attempts 1; segundo -> se descarta
    await flushQueue(store, fetchImpl as unknown as typeof fetch, 2);
    const after1 = await store.all();
    expect(after1[0].attempts).toBe(1);

    const r2 = await flushQueue(store, fetchImpl as unknown as typeof fetch, 2);
    expect(r2.remaining).toBe(0);
  });
});
