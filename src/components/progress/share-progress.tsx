"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Share a quick progress summary via the native share sheet (mobile) or
// clipboard (desktop). Keeps it text-based for reliability across devices.
export function ShareProgress({
  streak,
  sessions,
  volume,
}: {
  streak: number;
  sessions: number;
  volume: number;
}) {
  const [loading, setLoading] = useState(false);

  async function share() {
    setLoading(true);
    const text =
      `💪 My GymTrack Pro progress:\n` +
      `🔥 ${streak}-day streak\n` +
      `🏋️ ${sessions} workouts logged\n` +
      `📊 ${Math.round(volume).toLocaleString()} kg total volume\n\n` +
      `Training with GymTrack Pro · gymtrackpro.xyz`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My GymTrack Pro progress", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Progress copied! Paste it anywhere.");
      }
    } catch {
      /* user cancelled — no error needed */
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={share}
      disabled={loading}
      className="pressable flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 text-volt" />}
      Share progress
    </button>
  );
}
