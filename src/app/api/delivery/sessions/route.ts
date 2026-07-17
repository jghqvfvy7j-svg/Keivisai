import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverySessionSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

/** POST: registra una sesión de delivery del usuario autenticado. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = deliverySessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const f = parsed.data;

  // user_id se resuelve de la sesión; nunca se confía en el cliente. RLS lo exige.
  const row = {
    user_id: user.id,
    platform: f.platform,
    work_date: f.workDate,
    base_pay: f.basePay,
    tips: f.tips,
    bonuses: f.bonuses,
    other_income: f.otherIncome,
    fuel_expense: f.fuelExpense,
    toll_expense: f.tollExpense,
    parking_expense: f.parkingExpense,
    other_expense: f.otherExpense,
    duration_minutes: f.durationMinutes,
    starting_odometer: f.startingOdometer,
    ending_odometer: f.endingOdometer,
    zone: f.zone ?? null,
    notes: f.notes ?? null,
    status: 'terminada' as const,
    source: 'manual' as const,
    dedupe_key: f.dedupeKey ?? null,
  };

  const { data, error } = await supabase
    .from('delivery_sessions')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    // Violación de índice único (dedupe_key) => reintento idempotente
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auditoría (tabla de servidor). No bloquear si falla.
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      user_id: user.id,
      actor_type: 'user',
      action: 'delivery.create',
      entity_type: 'delivery_session',
      entity_id: data.id,
      after_data: row,
    });
  } catch {
    /* auditoría best-effort */
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

/** GET: lista sesiones del usuario (opcionalmente por rango ?from&to en YYYY-MM-DD). */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let q = supabase
    .from('delivery_sessions')
    .select('id,work_date,gross_income,net_income,duration_minutes,total_miles,zone,status')
    .order('work_date', { ascending: false })
    .limit(100);
  if (from) q = q.gte('work_date', from);
  if (to) q = q.lt('work_date', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ sessions: data });
}
