'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/inicio', label: 'Inicio', icon: '🏠' },
  { href: '/calendario', label: 'Calendario', icon: '🗓️' },
  { href: '/delivery', label: 'Delivery', icon: '🚗' },
  { href: '/metas', label: 'Metas', icon: '🎯' },
  { href: '/asistente', label: 'Asistente', icon: '💬' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 border-t"
      style={{
        background: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs"
                style={{ color: active ? 'rgb(var(--cat-work))' : 'rgb(var(--muted))' }}
              >
                <span aria-hidden className="text-lg leading-none">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
