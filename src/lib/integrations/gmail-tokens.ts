import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/env';
import { decryptToken, encryptToken } from '@/lib/security/crypto';
import { isTokenExpired, refreshAccessToken } from './google-calendar';

/** Devuelve un access token válido para Gmail, refrescándolo si venció. */
export async function getValidGmailAccess(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin.rpc('get_gmail_tokens', { p_user: userId });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.status !== 'conectado' || !row.encrypted_access_token) return null;

  let accessToken = decryptToken(row.encrypted_access_token);
  if (isTokenExpired(row.token_expires_at)) {
    if (!row.encrypted_refresh_token) return null;
    const env = getServerEnv();
    const t = await refreshAccessToken({
      refreshToken: decryptToken(row.encrypted_refresh_token),
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    });
    accessToken = t.access_token;
    await admin.rpc('update_gmail_access_token', {
      p_user: userId,
      p_access: encryptToken(accessToken),
      p_expires: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    });
  }
  return accessToken;
}
