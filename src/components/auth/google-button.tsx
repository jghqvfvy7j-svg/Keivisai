"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Sign in with Google. Supabase handles the OAuth handshake; we just kick it
 * off and point it at our callback route, which finishes the session and lets
 * the app decide whether the user still needs onboarding.
 */
export function GoogleButton({ redirect }: { redirect?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (redirect) callback.searchParams.set("redirect", redirect);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          // Always ask which account, so switching accounts is possible.
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
      // On success the browser is redirected to Google, so nothing else runs.
    } catch {
      toast.error("Couldn't start Google sign-in. Try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface text-sm font-semibold active:scale-[0.99] disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <GoogleG />
          Continue with Google
        </>
      )}
    </button>
  );
}

/** Google's four-colour G, inline so there's no external asset to load. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
