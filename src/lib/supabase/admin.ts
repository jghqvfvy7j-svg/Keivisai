import 'server-only';
import { createClient as createSb } from '@supabase/supabase-js';
import { clientEnv, getServerEnv } from '@/env';

/**
 * Cliente con service_role. SOLO servidor. Omite RLS: úsalo únicamente en
 * código de servidor que resuelve y filtra por user_id explícitamente.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSb(clientEnv.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
