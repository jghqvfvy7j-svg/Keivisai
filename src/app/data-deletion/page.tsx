import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Data Deletion — GymTrack Pro",
};

export default function DataDeletionPage() {
  return (
    <LegalShell title="Data Deletion" updated="July 2026">
      <p>
        You have the right to delete your GymTrack Pro account and all associated data at any time.
        This page explains what gets deleted and how to request it.
      </p>

      <LegalSection heading="What gets deleted">
        <p>
          Deleting your account permanently removes your profile, workout logs, nutrition logs, body
          measurements, routines and coach conversations. This action cannot be undone.
        </p>
      </LegalSection>

      <LegalSection heading="Option 1 — Delete from the app">
        <p>
          The fastest way: open <strong className="text-foreground">Settings → Danger zone → Delete account</strong>.
          You&apos;ll be asked to confirm, and your account and data will be removed.
        </p>
      </LegalSection>

      <LegalSection heading="Option 2 — Request by email">
        <p>
          If you can&apos;t access the app, email{" "}
          <a href="mailto:soporte@gymtrackpro.xyz" className="font-semibold text-volt">soporte@gymtrackpro.xyz</a>{" "}
          from the address linked to your account with the subject &quot;Delete my account&quot;. We will
          process your request and confirm once complete.
        </p>
      </LegalSection>

      <LegalSection heading="Timing">
        <p>
          In-app deletion is immediate. Email requests are processed within a reasonable period after we
          verify your identity.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
