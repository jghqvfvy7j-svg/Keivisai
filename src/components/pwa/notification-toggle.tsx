"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push/subscribe-client";

// Enables real push notifications: requests permission, subscribes the browser,
// and saves the subscription server-side so the cron job can send reminders.
export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("PushManager" in window)) {
      const id = requestAnimationFrame(() => setPermission("unsupported"));
      return () => cancelAnimationFrame(id);
    }
    const id = requestAnimationFrame(async () => {
      setPermission(Notification.permission);
      // Check if already subscribed.
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        }
      } catch { /* ignore */ }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (permission === "unsupported") {
    return <p className="text-xs text-muted">Notifications aren&apos;t supported on this device.</p>;
  }

  async function enable() {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error("Notifications were blocked. Enable them in your browser settings.");
        return;
      }
      const sub = await subscribeToPush();
      if (sub.ok) {
        setSubscribed(true);
        toast.success("Reminders enabled. We'll keep you on track. 💪");
      } else if (sub.error === "no_vapid") {
        toast.error("Push isn't configured yet. Add the VAPID keys in Vercel.");
      } else {
        toast.error("Couldn't enable reminders. Try again.");
      }
    } catch {
      toast.error("Couldn't enable notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setLoading(false);
    toast.success("Reminders turned off.");
  }

  if (permission === "granted" && subscribed) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-volt/30 bg-volt/5 p-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Check className="h-4 w-4 text-volt" /> Reminders are on
        </span>
        <button onClick={disable} disabled={loading} className="text-xs font-semibold text-muted hover:text-foreground">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Turn off"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={loading || permission === "denied"}
      className="pressable flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-semibold disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : permission === "denied" ? <BellOff className="h-4 w-4 text-muted" /> : <Bell className="h-4 w-4 text-volt" />}
      {permission === "denied" ? "Notifications blocked" : "Enable training reminders"}
    </button>
  );
}
