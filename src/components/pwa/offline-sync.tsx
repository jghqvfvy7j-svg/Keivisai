"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { flushPendingSessions } from "@/lib/offline-queue";

// Flushes any workout sessions that were saved offline — on app load and
// whenever the browser regains connectivity.
export function OfflineSync() {
  useEffect(() => {
    const flush = async () => {
      const n = await flushPendingSessions();
      if (n > 0) toast.success(`${n} workout${n > 1 ? "s" : ""} synced.`);
    };
    // Try on mount (covers "opened app after being offline").
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  return null;
}
