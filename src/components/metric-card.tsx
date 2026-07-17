export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgb(var(--surface))', boxShadow: '0 1px 2px rgb(0 0 0 / 0.04)' }}
    >
      <div className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? (
        <div className="mt-0.5 text-xs" style={{ color: 'rgb(var(--muted))' }}>{hint}</div>
      ) : null}
    </div>
  );
}
