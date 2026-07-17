export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
      <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
        Fase 3+: vistas día / semana / mes / agenda, semana desde domingo.
      </p>
      <a href="/importar" className="block rounded-2xl p-4 text-sm font-medium"
        style={{ background: 'rgb(var(--surface))', color: 'rgb(var(--cat-work))' }}>
        📷 Importar horario desde una foto
      </a>
    </div>
  );
}
