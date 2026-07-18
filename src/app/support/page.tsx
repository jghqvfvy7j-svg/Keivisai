import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Support — GymTrack Pro",
};

export default function SupportPage() {
  return (
    <LegalShell title="Support" updated="July 2026">
      <p>
        Need help, found a bug, or have a suggestion? We&apos;re here. Reach out and we&apos;ll get back to you.
      </p>

      <LegalSection heading="Email support">
        <a
          href="mailto:soporte@gymtrackpro.xyz?subject=GymTrack%20Pro%20Support"
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-volt/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt/15 text-volt">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">soporte@gymtrackpro.xyz</p>
            <p className="text-xs">Tap to send us an email</p>
          </div>
        </a>
      </LegalSection>

      <LegalSection heading="What to include">
        <p>
          To help us solve your issue faster, include: what you were trying to do, what happened, and
          (if possible) a screenshot. If it&apos;s about your account, email from the address you signed up with.
        </p>
      </LegalSection>

      <LegalSection heading="Response time">
        <p>We aim to respond within a couple of business days.</p>
      </LegalSection>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 p-4">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
        <p className="text-xs">
          Tip: many questions about plans, macros or progression can be answered instantly by the
          in-app AI coach.
        </p>
      </div>
    </LegalShell>
  );
}
