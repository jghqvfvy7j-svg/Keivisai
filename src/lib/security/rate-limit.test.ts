import { describe, expect, it } from 'vitest';
import { createMemoryStore, rateLimit } from './rate-limit';
import { createLogger } from '@/lib/log';

describe('rateLimit (ventana fija)', () => {
  it('permite hasta el límite y luego bloquea', () => {
    const store = createMemoryStore();
    const opts = { limit: 3, windowMs: 1000, now: 1000 };
    expect(rateLimit(store, 'k', opts).allowed).toBe(true);
    expect(rateLimit(store, 'k', opts).allowed).toBe(true);
    expect(rateLimit(store, 'k', opts).allowed).toBe(true);
    const blocked = rateLimit(store, 'k', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('se reinicia al pasar la ventana', () => {
    const store = createMemoryStore();
    rateLimit(store, 'k', { limit: 1, windowMs: 1000, now: 1000 });
    expect(rateLimit(store, 'k', { limit: 1, windowMs: 1000, now: 1500 }).allowed).toBe(false);
    expect(rateLimit(store, 'k', { limit: 1, windowMs: 1000, now: 2000 }).allowed).toBe(true);
  });

  it('claves distintas no interfieren', () => {
    const store = createMemoryStore();
    const opts = { limit: 1, windowMs: 1000, now: 1000 };
    expect(rateLimit(store, 'a', opts).allowed).toBe(true);
    expect(rateLimit(store, 'b', opts).allowed).toBe(true);
  });
});

describe('logger', () => {
  it('filtra por nivel', () => {
    const l = createLogger('warn', () => {});
    expect(l.shouldLog('info')).toBe(false);
    expect(l.shouldLog('warn')).toBe(true);
    expect(l.shouldLog('error')).toBe(true);
  });

  it('emite JSON con nivel y mensaje', () => {
    const lines: string[] = [];
    const l = createLogger('info', (line) => lines.push(line));
    l.info('hola', { userId: 'x' });
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe('info');
    expect(parsed.msg).toBe('hola');
    expect(parsed.userId).toBe('x');
  });
});
