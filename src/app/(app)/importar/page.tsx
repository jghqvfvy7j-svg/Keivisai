import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ScheduleImport } from '@/components/schedule-import';

export default async function ImportarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Importar horario</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
          Sube una foto de tu horario. Revisa la vista previa antes de guardar.
        </p>
      </header>
      <ScheduleImport />
    </div>
  );
}
