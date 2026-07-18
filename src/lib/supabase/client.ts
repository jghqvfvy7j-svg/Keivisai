'use client';
import { createBrowserClient } from '@supabase/ssr';
import { clientEnv } from '@/env';

/** Cliente Supabase para el navegador (anon key, contenido por RLS). */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
