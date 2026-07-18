"use client";

import { useEffect, useRef, useState } from "react";

// Animates a number from 0 to its value on mount, like an instrument readout.
// Respects prefers-reduced-motion (shows the final value instantly).
export function CountUp({
  value,
  duration = 900,
  className,
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [n, setN] = useState(value);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(value);
      return;
    }
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setN(value * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    setN(0);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={className}>{format ? format(n) : Math.round(n).toLocaleString()}</span>;
}
