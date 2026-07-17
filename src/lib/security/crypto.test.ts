import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from './crypto';

const KEY = randomBytes(32).toString('base64');

describe('cifrado de tokens (AES-256-GCM)', () => {
  it('ida y vuelta recupera el texto original', () => {
    const secret = 'ya29.a0AfH-fake-refresh-token';
    const enc = encryptToken(secret, KEY);
    expect(enc).not.toContain(secret);
    expect(decryptToken(enc, KEY)).toBe(secret);
  });

  it('cada cifrado usa un IV distinto', () => {
    const a = encryptToken('mismo', KEY);
    const b = encryptToken('mismo', KEY);
    expect(a).not.toBe(b);
  });

  it('detecta manipulación (falla la autenticación)', () => {
    const enc = encryptToken('secreto', KEY);
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0x01; // altera un byte del ciphertext
    expect(() => decryptToken(buf.toString('base64'), KEY)).toThrow();
  });

  it('rechaza clave de tamaño incorrecto', () => {
    expect(() => encryptToken('x', Buffer.from('corta').toString('base64'))).toThrow();
  });
});
