"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local error boundary for the Body page. Prevents a data hiccup (e.g. a missing
// table before its SQL is run) from crashing the whole page.
export default function BodyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { /* could log here */ }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <RefreshCw className="h-6 w-6" />
      </div>
      <div>
        <p className="font-display text-lg font-bold">Couldn&apos;t load this page</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Something went wrong loading your body data. Try again in a moment.
        </p>
      </div>
      <Button onClick={reset} className="pressable">
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
