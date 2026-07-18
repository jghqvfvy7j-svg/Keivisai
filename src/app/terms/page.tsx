import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms & Conditions — GymTrack Pro",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updated="July 2026">
      <p>
        Welcome to GymTrack Pro. By creating an account or using the app, you agree to these
        Terms &amp; Conditions. Please read them carefully. If you do not agree, do not use the app.
      </p>

      <LegalSection heading="1. What GymTrack Pro is">
        <p>
          GymTrack Pro is a fitness application that helps you plan workouts, track training and
          nutrition, and get AI-generated guidance. It provides general fitness information only.
        </p>
      </LegalSection>

      <LegalSection heading="2. Not medical advice">
        <p>
          The app, including the AI coach and any nutrition or training suggestions, provides general
          fitness guidance and is not a substitute for professional medical, nutritional or
          psychological advice. Always consult a qualified professional before starting a new exercise
          or diet program, especially if you have any health condition or injury. You use the app at
          your own risk.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your account">
        <p>
          You are responsible for keeping your login credentials secure and for all activity under your
          account. You must provide accurate information and be at least 16 years old (or the minimum
          age required in your country) to use the app.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>
          You agree not to misuse the app, attempt to access other users&apos; data, reverse-engineer the
          service, or use it for any unlawful purpose. We may suspend or terminate accounts that violate
          these terms.
        </p>
      </LegalSection>

      <LegalSection heading="5. AI-generated content">
        <p>
          Some features use artificial intelligence to generate plans, estimates and responses. These
          outputs are approximations and may contain errors. Calorie and macro estimates from text or
          photos are approximate and should not be relied on for medical or clinical purposes.
        </p>
      </LegalSection>

      <LegalSection heading="6. Limitation of liability">
        <p>
          To the fullest extent permitted by law, GymTrack Pro and its creators are not liable for any
          injury, loss or damage arising from your use of the app or reliance on its content.
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes to these terms">
        <p>
          We may update these terms from time to time. Continued use of the app after changes means you
          accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about these terms? Email us at{" "}
          <a href="mailto:soporte@gymtrackpro.xyz" className="font-semibold text-volt">soporte@gymtrackpro.xyz</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
