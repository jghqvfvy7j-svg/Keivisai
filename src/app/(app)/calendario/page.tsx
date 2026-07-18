import { Icon } from '@/components/icon';

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
      <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
        Fase 3+: vistas día / semana / mes / agenda, semana desde domingo.
      </p>
      <a href="/importar" className="card flex items-center gap-3 text-sm font-medium"
        style={{ color: 'rgb(var(--accent))' }}>
        <Icon name="camera" size={20} />
        Importar horario desde una foto
        <Icon name="chevronRight" size={18} className="ml-auto" />
      </a>
    </div>
  );
}
