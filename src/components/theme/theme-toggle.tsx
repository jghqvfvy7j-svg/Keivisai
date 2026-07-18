"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Pref = "system" | "light" | "dark";

function apply(pref: Pref) {
  const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = pref === "system" ? (sysDark ? "dark" : "light") : pref;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [pref, setPref] = useState<Pref>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("atlas-theme") as Pref) || "system";
  });

  useEffect(() => {
    // keep in sync with the OS when in system mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("atlas-theme") as Pref || "system") === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function choose(p: Pref) {
    setPref(p);
    try { localStorage.setItem("atlas-theme", p); } catch {}
    apply(p);
  }

  const options: { value: Pref; label: string; icon: typeof Sun }[] = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="flex gap-2">
      {options.map((o) => {
        const Icon = o.icon;
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            onClick={() => choose(o.value)}
            className={cn(
              "pressable flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-colors",
              active ? "border-volt bg-volt/10 text-foreground" : "border-border bg-surface-2 text-muted"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-volt")} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
