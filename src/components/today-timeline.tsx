import type { CalendarEvent, EventCategory } from '@/lib/domain/types';

const catVar: Record<EventCategory, string> = {
  trabajo: '--cat-work',
  almuerzo: '--cat-rest',
  gimnasio: '--cat-gym',
  delivery: '--cat-delivery',
  descanso: '--cat-rest',
  personal: '--cat-personal',
  cita: '--cat-personal',
  proyecto: '--cat-work',
  otro: '--cat-rest',
};

function hhmm(iso: string) {
  return new Intl.DateTimeFormat('es-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}

export function TodayTimeline({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--muted))' }}>
        Día libre. No hay nada programado.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 rounded-2xl p-3"
          style={{ background: 'rgb(var(--surface))' }}
        >
          <span
            aria-hidden
            className="h-10 w-1.5 rounded-full"
            style={{ background: `rgb(var(${catVar[e.category]}))` }}
          />
          <div className="flex-1">
            <div className="font-medium">{e.title}</div>
            <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              {hhmm(e.startsAt)} – {hhmm(e.endsAt)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
