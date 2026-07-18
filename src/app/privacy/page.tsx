import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — GymTrack Pro",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <p>
        Your privacy matters. This policy explains what data GymTrack Pro collects, how we use it, and
        the choices you have. By using the app you agree to this policy.
      </p>

      <LegalSection heading="1. Data we collect">
        <p>We collect only what the app needs to work:</p>
        <p>
          Account data (email, name), profile data you enter (goal, level, weight, height, training days,
          injuries), your workout logs, nutrition logs, body measurements, and coach conversations.
          If you choose to use them: photos you upload (meal photos for calorie estimates, progress
          photos, or a photo you send the coach), voice notes you record for the coach, and health data
          you import from Apple Health. All of these are optional — the app works without them.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your data">
        <p>
          Your data is used to run the app: build your plans, track progress, personalize the AI coach,
          and show your history. We do not sell your personal data to anyone.
        </p>
      </LegalSection>

      <LegalSection heading="3. Data isolation">
        <p>
          Every account is fully isolated. Row-Level Security at the database level ensures no user can
          ever access another user&apos;s workouts, meals, measurements or conversations.
        </p>
      </LegalSection>

      <LegalSection heading="4. AI processing">
        <p>
          When you use the AI coach or photo features, the relevant text or image is sent to our AI
          provider (Anthropic) to generate a response. When you send the coach a voice note, the audio is
          sent to our transcription provider (OpenAI) to convert it into text; only that text then goes to
          the coach. We do not keep a copy of the audio. This data is processed to give you a result and is
          handled according to each provider&apos;s data policies. Please avoid uploading sensitive personal
          documents unrelated to your fitness.
        </p>
      </LegalSection>

      <LegalSection heading="5. Storage and security">
        <p>
          Your data — including photos and voice notes — is stored with our infrastructure provider
          (Supabase). It is encrypted at rest using AES-256 and encrypted in transit using TLS, always on.
          Photos are kept in private storage that requires an authenticated request tied to your account.
        </p>
        <p>
          Row-Level Security means no other user can reach your data. In plain terms: your account is
          private, and only you can access it by signing in. For honesty we should be clear about one
          thing — encryption at rest protects your data if the physical storage were ever compromised, but
          it does not make your data invisible to us as the operator: to run the app (show your photos,
          let the coach read your history) our systems must be able to decrypt it. We access it only to
          operate and support the service, never to sell it. We support passkey sign-in (Face ID /
          fingerprint) for stronger account security.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>
          You can view and edit your profile data any time in Settings. You can request full deletion of
          your account and data — see our{" "}
          <a href="/data-deletion" className="font-semibold text-volt">Data Deletion</a> page.
        </p>
      </LegalSection>

      <LegalSection heading="7. Contact">
        <p>
          Privacy questions? Email{" "}
          <a href="mailto:soporte@gymtrackpro.xyz" className="font-semibold text-volt">soporte@gymtrackpro.xyz</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
