import { getProfile, getLatestConversation } from "@/lib/data";
import { coachIdentity } from "@/lib/ai/persona";
import { CoachChat } from "@/components/coach/coach-chat";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const [profile, convo] = await Promise.all([
    getProfile(),
    getLatestConversation(),
  ]);

  const coachName = coachIdentity(profile.gender).name;

  return (
    <CoachChat
      coachName={coachName}
      initialMessages={convo?.messages ?? []}
      initialConversationId={convo?.id ?? null}
    />
  );
}
