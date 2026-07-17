import { createHash, randomBytes } from 'node:crypto';

/** Genera un token MCP (se muestra una sola vez) y su hash para almacenar. */
export function generateMcpToken(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = `mcp_${randomBytes(32).toString('base64url')}`;
  return { plaintext, hash: hashToken(plaintext), prefix: plaintext.slice(0, 12) };
}

/** Hash SHA-256 (hex) del token. Sólo se guarda el hash, nunca el secreto. */
export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}
