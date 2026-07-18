// Sentry init for the Node.js server runtime.
// Fully gated on a DSN: with no SENTRY_DSN the SDK is disabled (no-op, no
// network), so the app behaves exactly as before. Set the DSN in Vercel to
// enable error tracking. We never send PII by default.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
});
