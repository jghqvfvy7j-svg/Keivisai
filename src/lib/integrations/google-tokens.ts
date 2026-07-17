import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/env';
import { decryptToken, encryptToken } from '@/lib/security/crypto';
import { isTokenExpired, refreshAccessToken } from './google-calendar';

/**
 * Devuelve un access token válido para Google Calendar, refrescándolo si venció.
 * Usa RPCs security definer (service_role) para tocar el esquema `private`.
 */
export async function getValidGoogleAccess(
  admin: SupabaseClient,
  userId: string,
): Promise<{ accessToken: string; calendarId: string } | null> {
  const { data } = await admin.rpc('get_google_calendar_tokens', { p_user: userId });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.status !== 'conectado' || !row.encrypted_access_token) return null;

  let accessToken = decryptToken(row.encrypted_access_token);
  const calendarId = row.calendar_id ?? 'primary';

  if (isTokenExpired(row.token_expires_at)) {
    if (!row.encrypted_refresh_token) return null;
    const env = getServerEnv();
    const refreshToken = decryptToken(row.encrypted_refresh_token);
    const t = await refreshAccessToken({
      refreshToken,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    });
    accessToken = t.access_token;
    const expires = new Date(Date.now() + t.expires_in * 1000).toISOString();
    await admin.rpc('update_google_access_token', {
      p_user: userId,
      p_access: encryptToken(accessToken),
      p_expires: expires,
    });
  }

  return { accessToken, calendarId };
}
