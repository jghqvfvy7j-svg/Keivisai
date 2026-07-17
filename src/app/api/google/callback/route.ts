import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerEnv } from '@/env';
import { decodeOAuthState, exchangeCodeForTokens } from '@/lib/integrations/google-calendar';
import { encryptToken } from '@/lib/security/crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const env = getServerEnv();
  const dest = new URL('/ajustes', env.GOOGLE_REDIRECT_URI);
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const nonce = (req.headers.get('cookie') ?? '').match(/g_oauth_nonce=([^;]+)/)?.[1];
  const decoded = state ? decodeOAuthState(state) : null;

  if (!code || !decoded || !nonce || decoded.n !== nonce) {
    dest.searchParams.set('error', 'state');
    return NextResponse.redirect(dest);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', env.GOOGLE_REDIRECT_URI));

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    });
    const admin = createAdminClient();
    const expires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const scopes = (tokens.scope ?? '').split(' ').filter(Boolean);

    if (decoded.k === 'gmail') {
      await admin.rpc('upsert_gmail_tokens', {
        p_user: user.id,
        p_email: null,
        p_access: encryptToken(tokens.access_token),
        p_refresh: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        p_expires: expires,
        p_scopes: scopes,
      });
      dest.searchParams.set('gmail', '1');
    } else {
      await admin.rpc('upsert_google_calendar_tokens', {
        p_user: user.id,
        p_email: null,
        p_calendar_id: 'primary',
        p_access: encryptToken(tokens.access_token),
        p_refresh: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        p_expires: expires,
        p_scopes: scopes,
      });
      dest.searchParams.set('connected', '1');
    }
  } catch {
    dest.searchParams.set('error', 'exchange');
  }

  const res = NextResponse.redirect(dest);
  res.cookies.set('g_oauth_nonce', '', { maxAge: 0, path: '/' });
  return res;
}
