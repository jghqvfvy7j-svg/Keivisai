import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaClient } from '@/components/pwa-client';

export const metadata: Metadata = {
  title: 'Keivis Assistant',
  description: 'Panel personal: calendario, gimnasio e ingresos de delivery.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Keivis' },
};

export const viewport: Viewport = {
  themeColor: '#1E56FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // evita zoom accidental en inputs
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <PwaClient />
        {children}
      </body>
    </html>
  );
}
