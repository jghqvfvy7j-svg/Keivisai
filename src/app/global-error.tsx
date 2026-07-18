"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors in the root layout itself. Must include <html> and <body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0b0d", color: "#f5f5f7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: "8px", color: "#a1a1a6", fontSize: "14px" }}>
            Please refresh the page to continue.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: "24px", background: "#30d158", color: "#04120a", fontWeight: 700, border: "none", padding: "12px 24px", borderRadius: "12px", fontSize: "15px" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
