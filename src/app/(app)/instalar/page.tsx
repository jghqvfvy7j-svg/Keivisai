import { InstallGuide } from '@/components/install-guide';

export default function InstalarPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Instalar en iPhone</h1>
        <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
          Añádela a tu pantalla de inicio para abrirla como una app.
        </p>
      </header>
      <InstallGuide />
    </div>
  );
}
