"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable as a PWA and works
// offline. Runs once on mount, only in browsers that support it.
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration is best-effort; app works fine without it */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
