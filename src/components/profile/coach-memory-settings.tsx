"use client";

import { useEffect, useState } from "react";
import { Brain, Trash2, Loader2, PauseCircle, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Memory = { id: string; content: string; created_at: string; kind?: string | null };

/**
 * Lets the user decide whether their coach may remember things about them, see
 * exactly what it remembers, edit the wording, and erase it. Memory is off until
 * they say yes.
 */
export function CoachMemorySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmingAll, setConfirmingAll] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/coach/memory");
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!active) return;
        setConsent(json.consent === true);
        setMemories(Array.isArray(json.memories) ? json.memories : []);
      } catch {
        /* leave defaults; the section simply shows as off */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function setConsentValue(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/coach/memory", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
      setConsent(next);
      // Pausing never erases. The memories stay exactly as they were, so turning
      // this back on tomorrow picks up where it left off.
      toast.success(
        next
          ? "Your coach can remember you again."
          : "Paused. Nothing was deleted, your coach just won't use it."
      );
    } catch {
      toast.error("Could not update. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function forgetOne(id: string) {
    setMemories((m) => m.filter((x) => x.id !== id));
    await fetch("/api/coach/memory", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  function startEdit(m: Memory) {
    setEditingId(m.id);
    setEditText(m.content);
  }

  async function saveEdit() {
    const id = editingId;
    const content = editText.trim();
    if (!id || !content) { setEditingId(null); return; }
    const prev = memories;
    setMemories((m) => m.map((x) => (x.id === id ? { ...x, content } : x)));
    setEditingId(null);
    try {
      const res = await fetch("/api/coach/memory", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, content }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error();
    } catch {
      setMemories(prev); // revert on failure
      toast.error("Could not save the edit. Try again.");
    }
  }

  async function forgetAll() {
    // Two-step: the first tap arms the confirmation, the second erases. This is
    // destructive and permanent, so it should never be a single accidental tap.
    if (!confirmingAll) {
      setConfirmingAll(true);
      return;
    }
    setConfirmingAll(false);
    setMemories([]);
    await fetch("/api/coach/memory", { method: "DELETE" }).catch(() => {});
    toast("Everything forgotten.");
  }

  return (
    <Card>
      <CardContent className="p-5">
        <p className="flex items-center gap-2 font-display text-sm font-bold">
          <Brain className="h-4 w-4 text-volt" /> Coach memory
        </p>
        <p className="mt-1 text-xs text-muted">
          Your coach is yours alone. It never sees any other member, and no one else ever sees you.
          Turn this on and it will remember things you tell it, like an injury or a food you avoid,
          so you do not have to repeat yourself.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 p-3">
          <div className="pr-3">
            <p className="text-sm font-semibold">Let my coach remember me</p>
            <p className="text-xs text-muted">Pause any time. Pausing keeps what it knows.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={consent}
            aria-label="Let my coach remember me"
            disabled={loading || saving}
            onClick={() => setConsentValue(!consent)}
            className={
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 " +
              (consent ? "bg-volt" : "bg-surface-3")
            }
          >
            {/* Anchored with an explicit left so the knob can never sit outside
                the track: 4px inset, sliding 20px across a 48px track. */}
            <span
              className={
                "absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform " +
                (consent ? "translate-x-5" : "translate-x-0")
              }
            />
          </button>
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
          </p>
        ) : (
          <>
            {/* Paused: memories are kept, just not used. Deleting is a separate,
                deliberate choice, never a side effect of the switch. */}
            {!consent && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
                <PauseCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-2" />
                {memories.length > 0
                  ? "Paused. Your coach is not using or adding memories, and nothing was deleted. Switch it back on and it picks up right where you left off."
                  : "Paused. Your coach starts each conversation knowing only your profile and the workouts and meals you log."}
              </p>
            )}

            {memories.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {consent ? "What it remembers" : "Saved, but paused"}
                  </p>
                  <button
                    onClick={forgetAll}
                    onBlur={() => setConfirmingAll(false)}
                    className="text-xs font-semibold text-danger"
                  >
                    {confirmingAll ? "Tap again to confirm" : "Forget everything"}
                  </button>
                </div>

                <div className={"mt-2 flex flex-col gap-1.5 " + (consent ? "" : "opacity-60")}>
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2 rounded-xl bg-surface-2 p-2.5"
                    >
                      {editingId === m.id ? (
                        <>
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            maxLength={500}
                            autoFocus
                            className="min-w-0 flex-1 rounded-lg bg-surface px-2 py-1 text-sm outline-none ring-1 ring-border-strong"
                          />
                          <button
                            onClick={saveEdit}
                            aria-label="Save"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-volt"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            {m.kind && m.kind !== "note" && (
                              <span className="mr-1.5 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                {m.kind}
                              </span>
                            )}
                            <span className="text-sm">{m.content}</span>
                          </div>
                          <button
                            onClick={() => startEdit(m)}
                            aria-label="Edit this"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-2 hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => forgetOne(m.id)}
                            aria-label="Forget this"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-2 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {consent && memories.length === 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  What it remembers
                </p>
                <p className="mt-2 text-sm text-muted">
                  Nothing yet. As you chat, useful details will show up here.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
