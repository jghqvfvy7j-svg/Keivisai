export function MetricCard({
  label,
  value,
  hint,
  positive,
}: {
  label: string;
  value: string;
  hint?: string;
  positive?: boolean;
}) {
  return (
    <div className="card">
      <div className="eyebrow">{label}</div>
      <div className="metric mt-1.5" style={positive ? { color: 'rgb(var(--positive))' } : undefined}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs tabnum" style={{ color: 'rgb(var(--muted))' }}>{hint}</div>
      ) : null}
    </div>
  );
}
