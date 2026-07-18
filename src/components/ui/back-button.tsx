"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Goes back to wherever the user came from (workout day, library, search…),
// instead of a hardcoded destination. Falls back to a label if provided.
export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="pressable flex items-center gap-1.5 pt-2 text-sm font-semibold text-muted"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
