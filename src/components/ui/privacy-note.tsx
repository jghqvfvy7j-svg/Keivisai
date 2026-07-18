import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * A small, honest reassurance shown wherever the user uploads something private
 * (photos, health data). The wording is deliberately accurate: encrypted and
 * private to their account — not "nobody can ever see it", which would be a
 * promise we cannot keep as the operator of the service.
 */
export function PrivacyNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-2">
      <Lock className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        {children ?? "Encrypted and private to your account."}{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          How we protect your data
        </Link>
      </span>
    </p>
  );
}
