"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  // Hide the bar while the user is typing. On mobile the keyboard covers the
  // bottom anyway, and a fixed bar otherwise floats up into the middle of the
  // screen (looks broken). We watch focus on any editable element app-wide.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isEditable(e.target)) setTyping(true);
    };
    const onFocusOut = () => {
      // Check after the browser moves focus, so switching between two inputs
      // doesn't flash the bar back on.
      setTimeout(() => setTyping(isEditable(document.activeElement)), 0);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <nav
      className={cn(
        "glass fixed inset-x-0 bottom-0 z-40 border-t border-hairline pb-safe pt-2 transition-transform duration-200 lg:hidden",
        typing && "pointer-events-none translate-y-full"
      )}
      aria-label="Primary"
      aria-hidden={typing}
    >
      <ul className="mx-auto flex max-w-md items-end justify-between px-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const isPrimary = "primary" in item && item.primary;

          if (isPrimary) {
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-signal to-signal-2 shadow-[0_6px_20px_rgba(77,141,255,0.35)] transition-transform",
                      active && "scale-105"
                    )}
                  >
                    <Icon className="h-6 w-6 text-signal-ink" strokeWidth={2.4} />
                  </span>
                  <span className="mt-1 text-[10px] font-semibold text-text-2">{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href} className="flex-1">
              <Link href={item.href} className="flex flex-col items-center gap-1 py-1.5">
                <Icon
                  className={cn("h-[22px] w-[22px] transition-colors", active ? "text-text" : "text-text-3")}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={cn("text-[10px] font-semibold", active ? "text-text" : "text-text-3")}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
