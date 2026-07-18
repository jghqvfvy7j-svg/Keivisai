"use client";

import { useState } from "react";
import { Trash2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import type { RecentSession } from "@/lib/data";

// Lists recent workout sessions with the option to delete a mistaken one.
export function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  const [items, setItems] = useState(sessions);

  if (items.length === 0) return null;

  async function remove(id: string) {
    const prev = items;
    setItems((s) => s.filter((x) => x.id !== id));
    try {
      const res = await fetch("/api/workouts/session", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      toast.success("Session removed.");
    } catch {
      setItems(prev);
      toast.error("Couldn't remove that session.");
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <p className="font-display text-sm font-bold">Recent workouts</p>
        <div className="mt-3 flex flex-col gap-2">
          {items.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt/15 text-volt">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{s.focus || "Workout"}</p>
                  <p className="text-xs text-muted">
                    {s.date}{s.durationMin ? ` · ${s.durationMin} min` : ""}{s.volume ? ` · ${s.volume.toLocaleString()} kg` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="pressable text-muted-2 hover:text-danger"
                aria-label="Delete session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
