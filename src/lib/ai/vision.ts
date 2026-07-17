import 'server-only';
import { getServerEnv } from '@/env';
import { scheduleExtractionSchema } from '@/lib/validation/schemas';

/**
 * Extrae la fila "Keivis" de una foto de horario usando un modelo con visión
 * (OpenAI Responses API con entrada de imagen). Devuelve filas {date, code}.
 * Aislado: si el formato del wire cambia, sólo se toca este archivo. No inventa
 * días; el resultado siempre pasa a una vista previa editable antes de guardar.
 */
export async function extractScheduleFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<{ rows: { date: string; code: string }[] }> {
  const env = getServerEnv();
  const instruction =
    'Extrae SOLO la fila cuyo nombre sea "Keivis" de esta tabla de horario semanal. ' +
    'Devuelve JSON estricto: {"rows":[{"date":"YYYY-MM-DD","code":"AM|PM|OFF|Utility AM|Utility PM"}]}. ' +
    'No inventes días ni horarios. Si una fecha o código no está claro, omítelo. Responde SOLO JSON.';

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL_VISION,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: instruction },
            { type: 'input_image', image_url: `data:${mimeType};base64,${imageBase64}` },
          ],
        },
      ],
      text: { format: { type: 'json_object' } },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI vision ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as { output?: { content?: { type: string; text?: string }[] }[] };
  const text = (data.output ?? [])
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === 'output_text' && c.text)
    .map((c) => c.text as string)
    .join('');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('La respuesta de visión no es JSON válido');
  }
  const v = scheduleExtractionSchema.safeParse(parsed);
  if (!v.success) throw new Error('Estructura de extracción inválida');
  return v.data;
}
