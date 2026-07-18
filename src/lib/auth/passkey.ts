"use client";

import { createClient } from "@/lib/supabase/client";

// Passkey (WebAuthn) helpers built on Supabase's experimental passkey API.
// Everything degrades gracefully: if the browser or project doesn't support
// passkeys, callers get a clear { ok:false, reason } instead of a crash.

export function browserSupportsPasskeys(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

type Result = { ok: true } | { ok: false; reason: string };

// Sign in with a passkey (Face ID / fingerprint / device key).
export async function signInWithPasskey(): Promise<Result> {
  if (!browserSupportsPasskeys()) {
    return { ok: false, reason: "This device doesn't support passkeys." };
  }
  try {
    const supabase = createClient();
    const auth = supabase.auth as unknown as {
      signInWithPasskey?: () => Promise<{ error: { message: string } | null }>;
    };
    if (typeof auth.signInWithPasskey !== "function") {
      return { ok: false, reason: "Passkey sign-in isn't enabled for this project yet." };
    }
    const { error } = await auth.signInWithPasskey();
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Passkey sign-in failed.";
    if (/cancel|abort|not allowed/i.test(msg)) return { ok: false, reason: "cancelled" };
    return { ok: false, reason: msg };
  }
}

// Register (enroll) a passkey for the currently signed-in user.
export async function registerPasskey(): Promise<Result> {
  if (!browserSupportsPasskeys()) {
    return { ok: false, reason: "This device doesn't support passkeys." };
  }
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "Sign in first, then add a passkey." };

    const auth = supabase.auth as unknown as {
      registerPasskey?: (args: { friendlyName?: string }) => Promise<{ error: { message: string } | null }>;
    };
    if (typeof auth.registerPasskey !== "function") {
      return { ok: false, reason: "Passkeys aren't enabled for this project yet." };
    }
    const { error } = await auth.registerPasskey({ friendlyName: "My device" });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Couldn't add passkey.";
    if (/cancel|abort|not allowed/i.test(msg)) return { ok: false, reason: "cancelled" };
    return { ok: false, reason: msg };
  }
}
