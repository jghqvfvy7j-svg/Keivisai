import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/env';
import { GMAIL_SCOPES, encodeOAuthState, googleAuthUrl } from '@/lib/integrations/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const env = getServerEnv();
  if (!user) return NextResponse.redirect(new URL('/login', env.GOOGLE_REDIRECT_URI));

  const nonce = randomUUID();
  const url = googleAuthUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: env.GOOGLE_REDIRECT_URI, // mismo redirect URI; el state distingue el flujo
    state: encodeOAuthState({ n: nonce, k: 'gmail' }),
    scopes: GMAIL_SCOPES,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set('g_oauth_nonce', nonce, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return res;
}
