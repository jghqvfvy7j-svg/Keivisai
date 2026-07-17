'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GOAL_TYPES, type GoalType } from '@/lib/goal-config';

const inputStyle = { borderColor: 'rgb(var(--border))', background: 'rgb(var(--surface))' } as const;

export function GoalForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<GoalType>('ganancias');
  const [period, setPeriod] = useState('semanal');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || GOAL_TYPES[type].label,
          type,
          period,
          targetValue: Number(target),
          unit: GOAL_TYPES[type].unit,
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear la meta');
      setName(''); setTarget(''); setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="min-h-[48px] w-full rounded-xl font-medium text-white"
        style={{ background: 'rgb(var(--cat-work))' }}>
        + Nueva meta
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgb(var(--surface))' }}>
      <div className="space-y-2">
        <input className="w-full rounded-xl border px-3 py-2" style={inputStyle}
          placeholder="Nombre (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="w-full rounded-xl border px-3 py-2" style={inputStyle}
          value={type} onChange={(e) => setType(e.target.value as GoalType)}>
          {Object.entries(GOAL_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select className="rounded-xl border px-3 py-2" style={inputStyle}
            value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </select>
          <input className="rounded-xl border px-3 py-2" style={inputStyle} inputMode="decimal"
            placeholder={`Objetivo (${GOAL_TYPES[type].unit})`} value={target}
            onChange={(e) => setTarget(e.target.value)} />
        </div>
        {error ? <p role="alert" className="text-sm" style={{ color: 'rgb(var(--cat-delivery))' }}>{error}</p> : null}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !target}
            className="min-h-[44px] flex-1 rounded-xl font-medium text-white disabled:opacity-60"
            style={{ background: 'rgb(var(--cat-work))' }}>
            {saving ? 'Guardando…' : 'Crear'}
          </button>
          <button onClick={() => setOpen(false)}
            className="min-h-[44px] rounded-xl border px-4" style={inputStyle}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
