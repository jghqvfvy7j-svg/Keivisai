import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssistantChat, type ChatMessage } from '@/components/assistant-chat';

export default async function AsistentePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: conv } = await supabase
    .from('assistant_conversations')
    .select('id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialMessages: ChatMessage[] = [];
  if (conv?.id) {
    const { data: msgs } = await supabase
      .from('assistant_messages')
      .select('role,content')
      .eq('conversation_id', conv.id)
      .in('role', ['user', 'assistant'])
      .order('created_at');
    initialMessages = (msgs ?? [])
      .filter((m) => m.content)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Asistente</h1>
      </header>
      <AssistantChat initialConversationId={conv?.id ?? null} initialMessages={initialMessages} />
    </div>
  );
}
