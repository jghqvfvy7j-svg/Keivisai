"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signInWithPasskey, browserSupportsPasskeys } from "@/lib/auth/passkey";

// "Sign in with a passkey" button. Only shows when the browser supports it.
export function PasskeyLogin() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect passkey support after mount (avoids SSR mismatch).
  useEffect(() => {
    const id = requestAnimationFrame(() => setSupported(browserSupportsPasskeys()));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!supported) return null;

  async function onClick() {
    setLoading(true);
    const res = await signInWithPasskey();
    setLoading(false);
    if (res.ok) {
      router.push("/home");
    } else if (res.reason !== "cancelled") {
      toast.error(res.reason);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <button
        onClick={onClick}
        disabled={loading}
        className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-semibold"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4 text-volt" />}
        Sign in with Face ID / fingerprint
      </button>
    </div>
  );
}
