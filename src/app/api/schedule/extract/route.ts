import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { extractScheduleFromImage } from '@/lib/ai/vision';
import { buildEventsFromSchedule } from '@/lib/schedule/build';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BASE64 = 8 * 1024 * 1024; // ~6 MB de imagen

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const rl = checkRateLimit(`schedule:${user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });


  const body = (await req.json().catch(() => null)) as
    | { imageBase64?: string; mimeType?: string; filename?: string }
    | null;
  if (!body?.imageBase64 || !body.mimeType) {
    return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
  }
  if (body.imageBase64.length > MAX_BASE64) {
    return NextResponse.json({ error: 'Imagen demasiado grande' }, { status: 413 });
  }

  try {
    const extraction = await extractScheduleFromImage(body.imageBase64, body.mimeType);
    const preview = buildEventsFromSchedule(extraction.rows);

    // Guarda SOLO los datos extraídos (no la imagen) para revisión.
    const { data: imp } = await supabase
      .from('schedule_imports')
      .insert({
        user_id: user.id,
        original_filename: body.filename ?? null,
        status: 'revision',
        extracted_data: extraction as object,
        validation_errors: preview.errors as object,
      })
      .select('id')
      .single();

    return NextResponse.json({ importId: imp?.id ?? null, ...preview });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de extracción' }, { status: 502 });
  }
}
