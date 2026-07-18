"use client";

import { useEffect } from "react";
import { saveOfflinePlan, type OfflinePlan } from "@/lib/offline-plan";

// Renders nothing. On mount it saves the active plan to localStorage so the
// /offline page can show it when there's no connection. Pure side-effect; it
// never affects what the Train page renders.
export function CachePlan({ plan }: { plan: OfflinePlan }) {
  useEffect(() => {
    saveOfflinePlan(plan);
  }, [plan]);
  return null;
}
