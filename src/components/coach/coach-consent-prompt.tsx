"use client";

import { useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Asked once, inside the coach, at the moment it actually matters.
 *
 * Until the person answers, the coach remembers nothing. Either answer is
 * recorded, so we never nag them again. They can change their mind whenever
 * they want in Settings.
 */
export function CoachConsentPrompt({ coachName }: { coachName: string }) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/coach/memory");
        if (!res.ok) return;
        const json = await res.json();
        // Only ask people who have never been asked.
        if (active && json.asked === false) setShow(true);
      } catch {
        /* if we can't tell, don't ask: silence is safer than a wrong prompt */
      }
    })();
    return () => { active = false; };
  }, []);

  async function answer(consent: boolean) {
    setSaving(true);
    try {
      await fetch("/api/coach/memory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      setShow(false);
    } catch {
      setShow(false);
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  return (
    <div className="animate-fade-up rounded-2xl border border-volt/30 bg-volt/5 p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Brain className="h-4 w-4 text-volt" /> Can I remember you?
      </p>
      <p className="mt-1.5 text-sm text-muted">
        If you say yes, I&apos;ll remember useful things you tell me, like an injury, a food you
        avoid, or the gear you have. That way you don&apos;t have to repeat yourself every time.
      </p>
      <p className="mt-2 text-xs text-muted-2">
        Only I see it, never other members. You can read everything I remember, delete any of it,
        or turn this off, any time, in Settings.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1 pressable" disabled={saving} onClick={() => answer(true)}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, remember me"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 pressable"
          disabled={saving}
          onClick={() => answer(false)}
        >
          No, thanks
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-2">
        Either way, {coachName} still sees your profile and the workouts and meals you log.
      </p>
    </div>
  );
}
