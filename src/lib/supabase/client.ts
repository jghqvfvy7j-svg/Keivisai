import { createBrowserClient } from "@supabase/ssr";

// Browser client — used in Client Components ("use client").
// The passkey (WebAuthn) API is experimental in @supabase/auth-js and OFF by
// default, so we opt in here. This only affects the browser client; passkeys
// are a browser-only feature (Face ID / fingerprint / device key).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        experimental: { passkey: true },
      },
    }
  );
}
