import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmailList, type EmailRow } from '@/components/email-list';

export default async function CorreosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('email_summaries')
    .select('id,sender,subject,received_at,snippet,classification,requires_attention,user_feedback')
    .eq('user_id', user.id)
    .order('requires_attention', { ascending: false })
    .order('received_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Correos importantes</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
          Marca "importante" o "no importante" para afinar la clasificación.
        </p>
      </header>
      <EmailList emails={(data ?? []) as EmailRow[]} />
    </div>
  );
}
