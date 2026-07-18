"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send the full error to Sentry (the secure sink for stack traces; PII
    // scrubbing is on and sendDefaultPii is false). The console stays sanitized
    // to just the opaque digest, so nothing sensitive lands in browser logs.
    Sentry.captureException(error);
    console.error("App error", error.digest ?? "");
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <Logo variant="full" />
      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/15">
        <RefreshCw className="h-8 w-8 text-danger" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        We hit an unexpected error. Try again, and if it keeps happening, let us know.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset} size="lg" className="pressable">
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
        <Button asChild size="lg" variant="secondary" className="pressable">
          <Link href="/home">
            <Home className="h-4 w-4" /> Home
          </Link>
        </Button>
      </div>
      <a
        href="mailto:soporte@gymtrackpro.xyz?subject=GymTrack%20Pro%20-%20Error%20report"
        className="mt-6 text-xs text-muted-2 hover:text-muted"
      >
        Report this problem
      </a>
    </div>
  );
}
