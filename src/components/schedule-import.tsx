'use client';
import { Icon } from '@/components/icon';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PreviewEvent {
  title: string;
  category: 'trabajo' | 'almuerzo' | 'gimnasio' | 'delivery' | 'descanso' | 'personal' | 'cita' | 'proyecto' | 'otro';
  startsAt: string;
  endsAt: string;
}
interface Preview {
  importId: string | null;
  events: PreviewEvent[];
  errors: { date: string; code: string; reason: string }[];
  offDays: string[];
}

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('es-US', { timeZone: 'America/New_York', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
const fmtHM = (iso: string) =>
  new Intl.DateTimeFormat('es-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));

export function ScheduleImport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onFile(file: File) {
    setError(null);
    setDone(null);
    setLoading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('No se pudo leer la imagen'));
        r.readAsDataURL(file);
      });
      const [meta, b64] = dataUrl.split(',');
      const mimeType = meta.slice(5, meta.indexOf(';'));
      const res = await fetch('/api/schedule/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mimeType, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo procesar la imagen');
      setPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  function removeEvent(i: number) {
    setPreview((p) => (p ? { ...p, events: p.events.filter((_, idx) => idx !== i) } : p));
  }

  async function confirm() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/schedule/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId: preview.importId ?? undefined, events: preview.events }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar');
      setDone(data.created ?? 0);
      setPreview(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!preview ? (
        <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center text-sm"
          style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))', background: 'rgb(var(--surface))' }}>
          {loading ? 'Analizando la foto…' : 'Tomar foto o elegir de la galería'}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} disabled={loading} />
        </label>
      ) : null}

      {error ? <p role="alert" className="text-sm" style={{ color: 'rgb(var(--cat-delivery))' }}>{error}</p> : null}
      {done != null ? (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgb(var(--surface))' }}>
          Se crearon <strong>{done}</strong> eventos. <a href="/inicio" style={{ color: 'rgb(var(--cat-work))' }}>Ver en Inicio</a>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3">
          <div className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
            Revisa y quita lo que no quieras. Nada se guarda hasta que confirmes.
          </div>

          {preview.errors.length > 0 ? (
            <div className="rounded-2xl p-3 text-sm" style={{ background: 'rgb(var(--cat-goal) / 0.12)' }}>
              Revisar: {preview.errors.map((e) => `${e.date} (${e.code}: ${e.reason})`).join(', ')}
            </div>
          ) : null}

          <ul className="space-y-2">
            {preview.events.map((e, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl p-3" style={{ background: 'rgb(var(--surface))' }}>
                <div>
                  <div className="font-medium capitalize">{fmtDay(e.startsAt)} · {e.title}</div>
                  <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{fmtHM(e.startsAt)} – {fmtHM(e.endsAt)}</div>
                </div>
                <button onClick={() => removeEvent(i)} aria-label="Quitar" style={{ color: 'rgb(var(--muted))' }}><Icon name="x" size={16} /></button>
              </li>
            ))}
          </ul>

          {preview.offDays.length > 0 ? (
            <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Días libres detectados: {preview.offDays.join(', ')}</div>
          ) : null}

          <div className="flex gap-2">
            <button onClick={confirm} disabled={loading || preview.events.length === 0}
              className="flex-1 rounded-xl py-3 font-medium text-white disabled:opacity-60" style={{ background: 'rgb(var(--cat-work))' }}>
              {loading ? 'Guardando…' : `Confirmar (${preview.events.length})`}
            </button>
            <button onClick={() => setPreview(null)} className="rounded-xl border px-4" style={{ borderColor: 'rgb(var(--border))' }}>Cancelar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
