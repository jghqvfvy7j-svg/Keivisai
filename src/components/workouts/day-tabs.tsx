"use client";

import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui/tabs";

// Wraps the workout day Tabs and picks the initial tab based on the user's LOCAL
// weekday. If a routine day is named after today's weekday (e.g. "Friday"), that
// day opens first. Otherwise it falls back to the provided default.
export function DayTabs({
  days,
  fallbackValue,
  children,
}: {
  days: { id: string; day_name: string }[];
  fallbackValue: string;
  children: React.ReactNode;
}) {
  // Compute the best initial value once, using the browser's local weekday.
  const [value, setValue] = useState(fallbackValue);

  useEffect(() => {
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    // Find a day whose name matches today's weekday (handles "Monday", "Lunes",
    // or names that contain the weekday like "Friday - Push").
    const match = days.find((d) => {
      const name = (d.day_name || "").toLowerCase();
      return name.includes(weekday) || weekday.includes(name);
    });
    if (match) {
      const t = setTimeout(() => setValue(match.id), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tabs value={value} onValueChange={setValue}>
      {children}
    </Tabs>
  );
}
