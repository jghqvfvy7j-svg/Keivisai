import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { goalSchema } from '@/lib/validation/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const g = parsed.data;

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      name: g.name,
      type: g.type,
      period: g.period,
      target_value: g.targetValue,
      unit: g.unit ?? null,
      status: 'activa',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data, error } = await supabase
    .from('goals')
    .select('id,name,type,period,target_value,unit,status')
    .eq('status', 'activa')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ goals: data });
}
