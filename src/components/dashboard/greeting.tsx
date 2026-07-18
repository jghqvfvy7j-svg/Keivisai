"use client";

import { useState, useEffect } from "react";

function computeGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// Computes the greeting in the USER'S local timezone (the server runs in UTC,
// so doing this on the server showed "Good morning" in the afternoon).
export function Greeting() {
  // Start with a neutral value to avoid SSR/client mismatch, then set on mount.
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const id = requestAnimationFrame(() => setGreeting(computeGreeting()));
    return () => cancelAnimationFrame(id);
  }, []);

  return <p className="text-sm text-muted">{greeting}</p>;
}
