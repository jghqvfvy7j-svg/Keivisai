"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { registerPasskey, browserSupportsPasskeys } from "@/lib/auth/passkey";

// "Add a passkey" button for the Settings page. Lets a signed-in user enroll
// Face ID / fingerprint / device key for faster, stronger sign-in.
export function PasskeyEnroll() {
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Detect passkey support after mount (avoids SSR mismatch).
  useEffect(() => {
    const id = requestAnimationFrame(() => setSupported(browserSupportsPasskeys()));
    return () => cancelAnimationFrame(id);
  }, []);

  async function onClick() {
    setLoading(true);
    const res = await registerPasskey();
    setLoading(false);
    if (res.ok) {
      setDone(true);
      toast.success("Passkey added. You can now sign in with Face ID / fingerprint.");
    } else if (res.reason !== "cancelled") {
      toast.error(res.reason);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted">
        This device doesn&apos;t support passkeys. Use a modern phone or browser to enable Face ID / fingerprint sign-in.
      </p>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={loading || done}
      className="pressable flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-semibold disabled:opacity-70"
    >
      {done ? <Check className="h-4 w-4 text-volt" /> : loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4 text-volt" />}
      {done ? "Passkey enabled" : "Add Face ID / fingerprint"}
    </button>
  );
}
