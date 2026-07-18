import webpush from "web-push";

// Configure web-push with VAPID keys (set these in Vercel env vars).
// Public key is also exposed to the client via NEXT_PUBLIC_VAPID_PUBLIC_KEY.
let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:soporte@gymtrackpro.xyz", pub, priv);
  configured = true;
  return true;
}

export type PushSub = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Send a notification to one subscription. Returns "gone" if the subscription
// is expired/invalid (so the caller can delete it).
export async function sendPush(
  sub: PushSub,
  payload: { title: string; body: string; url?: string }
): Promise<"ok" | "gone" | "error"> {
  if (!ensureConfigured()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    // 404/410 mean the subscription is dead and should be removed.
    if (status === 404 || status === 410) return "gone";
    return "error";
  }
}

export function pushConfigured(): boolean {
  return ensureConfigured();
}
