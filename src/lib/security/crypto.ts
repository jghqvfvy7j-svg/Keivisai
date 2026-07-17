import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifrado autenticado AES-256-GCM para tokens OAuth.
 * Formato de salida (base64): [iv(12) | tag(16) | ciphertext].
 * La clave son 32 bytes en base64 (GOOGLE_TOKEN_ENCRYPTION_KEY).
 */
const IV_LEN = 12;
const TAG_LEN = 16;

function resolveKey(keyB64?: string): Buffer {
  const value = keyB64 ?? process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? '';
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY debe ser 32 bytes en base64');
  }
  return key;
}

export function encryptToken(plaintext: string, keyB64?: string): string {
  const key = resolveKey(keyB64);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptToken(payload: string, keyB64?: string): string {
  const key = resolveKey(keyB64);
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
