'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { computeDeliveryMetrics } from '@/lib/domain/delivery';
import { formatUSD } from '@/lib/domain/money';
import { submitOrQueue } from '@/lib/offline/submit';

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function todayNY(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const inputCls = 'w-full rounded-xl border px-4 py-3 text-lg';
const inputStyle = { borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' } as const;

export function QuickDeliveryForm() {
  const router = useRouter();
  const [earnings, setEarnings] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [miles, setMiles] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [fuel, setFuel] = useState('');
  const [otherExp, setOtherExp] = useState('');
  const [zone, setZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [queued, setQueued] = useState(false);

  const durationMinutes = num(hours) * 60 + num(minutes);

  const preview = useMemo(() => {
    try {
      return computeDeliveryMetrics({
        basePay: num(earnings),
        tips: 0,
        bonuses: 0,
        otherIncome: 0,
        fuelExpense: num(fuel),
        tollExpense: 0,
        parkingExpense: 0,
        otherExpense: num(otherExp),
        durationMinutes: durationMinutes || null,
        startingOdometer: 0,
        endingOdometer: num(miles),
      });
    } catch {
      return null;
    }
  }, [earnings, fuel, otherExp, durationMinutes, miles]);

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const payload = {
        platform: 'doordash',
        workDate: todayNY(),
        basePay: num(earnings),
        fuelExpense: num(fuel),
        otherExpense: num(otherExp),
        durationMinutes: durationMinutes || null,
        startingOdometer: 0,
        endingOdometer: num(miles) || null,
        zone: zone || undefined,
        dedupeKey: crypto.randomUUID(),
      };
      const r = await submitOrQueue('/api/delivery/sessions', payload);
      if (!r.queued && !r.ok) throw new Error('No se pudo guardar');
      setOk(true);
      setQueued(r.queued);
      setEarnings(''); setHours(''); setMinutes(''); setMiles('');
      setFuel(''); setOtherExp(''); setZone(''); setShowExtra(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--surface))' }}>
      <h3 className="mb-3 font-medium">Registrar delivery</h3>

      <label className="mb-2 block text-xs" style={{ color: 'rgb(var(--muted))' }}>Gané ($)</label>
      <input className={inputCls} style={inputStyle} inputMode="decimal" placeholder="87.35"
        value={earnings} onChange={(e) => setEarnings(e.target.value)} />

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'rgb(var(--muted))' }}>Horas</label>
          <input className="w-full rounded-xl border px-3 py-3 text-lg" style={inputStyle}
            inputMode="numeric" placeholder="3" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'rgb(var(--muted))' }}>Min</label>
          <input className="w-full rounded-xl border px-3 py-3 text-lg" style={inputStyle}
            inputMode="numeric" placeholder="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: 'rgb(var(--muted))' }}>Millas</label>
          <input className="w-full rounded-xl border px-3 py-3 text-lg" style={inputStyle}
            inputMode="decimal" placeholder="54.2" value={miles} onChange={(e) => setMiles(e.target.value)} />
        </div>
      </div>

      <button onClick={() => setShowExtra((v) => !v)}
        className="mt-3 text-sm" style={{ color: 'rgb(var(--cat-work))' }}>
        {showExtra ? '– Ocultar gastos y zona' : '+ Gastos y zona (opcional)'}
      </button>

      {showExtra ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="rounded-xl border px-3 py-2" style={inputStyle} inputMode="decimal"
            placeholder="Gasolina $" value={fuel} onChange={(e) => setFuel(e.target.value)} />
          <input className="rounded-xl border px-3 py-2" style={inputStyle} inputMode="decimal"
            placeholder="Otro gasto $" value={otherExp} onChange={(e) => setOtherExp(e.target.value)} />
          <input className="col-span-2 rounded-xl border px-3 py-2" style={inputStyle}
            placeholder="Zona (ej. Downtown Cincinnati)" value={zone} onChange={(e) => setZone(e.target.value)} />
        </div>
      ) : null}

      {preview ? (
        <div className="mt-4 flex gap-4 text-sm">
          <span><strong>{preview.hourlyRateCents == null ? '—' : formatUSD(preview.hourlyRateCents)}</strong> /hora</span>
          <span><strong>{preview.perMileCents == null ? '—' : formatUSD(preview.perMileCents)}</strong> /milla</span>
          <span style={{ color: 'rgb(var(--muted))' }}>Neto {formatUSD(preview.netCents)}</span>
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-2 text-sm" style={{ color: 'rgb(var(--cat-delivery))' }}>{error}</p> : null}
      {ok ? <p className="mt-2 text-sm" style={{ color: 'rgb(var(--cat-gym))' }}>{queued ? 'Guardado. Se sincronizará al reconectar.' : 'Guardado.'}</p> : null}

      <button onClick={save} disabled={saving || num(earnings) === 0}
        className="mt-4 min-h-[48px] w-full rounded-xl font-medium text-white disabled:opacity-60"
        style={{ background: 'rgb(var(--cat-delivery))' }}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
