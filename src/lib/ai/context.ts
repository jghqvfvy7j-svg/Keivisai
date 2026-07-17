import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { dayRange, weekRange } from '@/lib/domain/week';
import { aggregateSessions, type StoredSession } from '@/lib/domain/stats';
import { formatUSD } from '@/lib/domain/money';

const TZ = 'America/New_York';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/**
 * Recupera SOLO el contexto relevante (no toda la BD): preferencias, agenda de
 * hoy, resumen de la semana y metas activas. Devuelve un texto compacto.
 */
export async function buildContext(supabase: SupabaseClient, userId: string): Promise<string> {
  const now = new Date();
  const day = dayRange(now, TZ);
  const week = weekRange(now, TZ);

  const [{ data: prefs }, { data: events }, { data: sessions }, { data: goals }] = await Promise.all([
    supabase.from('user_preferences').select('preferred_delivery_location,assistant_language').eq('user_id', userId).maybeSingle(),
    supabase.from('calendar_events').select('title,category,starts_at,ends_at').eq('user_id', userId)
      .is('deleted_at', null).gte('starts_at', day.start.toISOString()).lt('starts_at', day.end.toISOString()).order('starts_at'),
    supabase.from('delivery_sessions').select('gross_income,net_income,duration_minutes,total_miles,work_date,zone')
      .eq('user_id', userId).gte('work_date', ymd(week.start)).lt('work_date', ymd(week.end)),
    supabase.from('goals').select('name,type,period,target_value').eq('user_id', userId).eq('status', 'activa'),
  ]);

  const rows: StoredSession[] = (sessions ?? []).map((s) => ({
    workDate: s.work_date,
    grossCents: Math.round(Number(s.gross_income ?? 0) * 100),
    netCents: Math.round(Number(s.net_income ?? 0) * 100),
    minutes: Number(s.duration_minutes ?? 0),
    miles: Number(s.total_miles ?? 0),
    zone: s.zone,
  }));
  const a = aggregateSessions(rows);

  const hoy = (events ?? []).length
    ? (events ?? []).map((e) => `${e.category}: ${e.title}`).join('; ')
    : 'día libre';

  const metas = (goals ?? []).length
    ? (goals ?? []).map((g) => `${g.name} (${g.type}/${g.period}: ${g.target_value})`).join('; ')
    : 'sin metas activas';

  return [
    `Zona de delivery habitual: ${prefs?.preferred_delivery_location ?? 'Downtown Cincinnati'}.`,
    `Hoy: ${hoy}.`,
    `Semana: ${a.sessions} sesiones, bruto ${formatUSD(a.grossCents)}, neto ${formatUSD(a.netCents)}, ` +
      `${(a.minutes / 60).toFixed(1)} h, ${a.miles} millas` +
      `${a.hourlyCents ? `, ${formatUSD(a.hourlyCents)}/h` : ''}.`,
    `Metas activas: ${metas}.`,
  ].join('\n');
}
