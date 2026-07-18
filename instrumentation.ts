// Next.js instrumentation hook: loads the right Sentry init per runtime.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports uncaught errors thrown in server components / route handlers.
export const onRequestError = Sentry.captureRequestError;
