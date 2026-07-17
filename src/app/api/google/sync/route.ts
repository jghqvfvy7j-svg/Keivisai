import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { weekRange } from '@/lib/domain/week';
import { getValidGoogleAccess } from '@/lib/integrations/google-tokens';
import { insertGoogleEvent, toGoogleEvent } from '@/lib/integrations/google-calendar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TZ = 'America/New_York';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const access = await getValidGoogleAccess(admin, user.id);
  if (!access) return NextResponse.json({ error: 'Google Calendar no está conectado' }, { status: 400 });

  // Empuja los eventos de esta semana y la siguiente que aún no están en Google.
  const week = weekRange(new Date(), TZ);
  const end = new Date(week.end);
  end.setUTCDate(end.getUTCDate() + 7);

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id,title,description,location,starts_at,ends_at,timezone')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .is('google_event_id', null)
    .gte('starts_at', week.start.toISOString())
    .lt('starts_at', end.toISOString());

  let pushed = 0;
  const errors: string[] = [];
  for (const e of events ?? []) {
    try {
      const body = toGoogleEvent(
        {
          title: e.title,
          description: e.description,
          location: e.location,
          startsAt: e.starts_at,
          endsAt: e.ends_at,
          timezone: e.timezone,
        },
        TZ,
      );
      const created = await insertGoogleEvent({ accessToken: access.accessToken, calendarId: access.calendarId, body });
      await supabase
        .from('calendar_events')
        .update({ google_event_id: created.id, google_calendar_id: access.calendarId, sync_status: 'sincronizado' })
        .eq('id', e.id)
        .eq('user_id', user.id);
      pushed++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'error');
    }
  }

  return NextResponse.json({ ok: true, pushed, errors });
}
