"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

// Shows an install banner. Two modes:
// - Android/desktop Chrome/Edge: uses the native beforeinstallprompt event.
// - iOS Safari: Apple blocks auto-install, so we show manual instructions
//   (tap Share → Add to Home Screen) since that's the only way on iPhone.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  // iOS uses navigator.standalone; others use display-mode media query.
  return (
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"none" | "native" | "ios">("none");

  useEffect(() => {
    // Already installed, or dismissed this session → show nothing.
    if (sessionStorage.getItem("install-dismissed")) return;
    if (isInStandaloneMode()) return;

    // iOS: no native event exists, so show the manual-instructions banner.
    if (isIos()) {
      const id = requestAnimationFrame(() => setMode("ios"));
      return () => cancelAnimationFrame(id);
    }

    // Android / desktop: wait for the native install event.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (mode === "none") return null;

  function dismiss() {
    sessionStorage.setItem("install-dismissed", "1");
    setMode("none");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setMode("none");
    setDeferred(null);
  }

  // iOS: instructions banner (tap Share, then Add to Home Screen).
  if (mode === "ios") {
    return (
      <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm lg:bottom-6">
        <div className="glass rounded-2xl border border-border p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-volt/15 text-volt">
              <Download className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Install GymTrack Pro</p>
              <p className="mt-0.5 text-xs text-muted">
                Get the full app with reminders on your iPhone.
              </p>
            </div>
            <button onClick={dismiss} className="shrink-0 text-muted" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs">
            <span>Tap</span>
            <Share className="h-4 w-4 text-volt" />
            <span>then</span>
            <span className="flex items-center gap-1 font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add to Home Screen
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Android / desktop: one-tap native install.
  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm lg:bottom-6">
      <div className="glass flex items-center gap-3 rounded-2xl border border-border p-3 shadow-2xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-volt/15 text-volt">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install GymTrack Pro</p>
          <p className="text-xs text-muted">Add it to your home screen for quick access.</p>
        </div>
        <button
          onClick={install}
          className="pressable shrink-0 rounded-xl bg-volt px-3 py-2 text-xs font-semibold text-volt-foreground"
        >
          Install
        </button>
        <button onClick={dismiss} className="shrink-0 text-muted" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
