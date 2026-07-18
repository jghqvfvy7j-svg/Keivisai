'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icon';

const items: { href: string; label: string; icon: IconName }[] = [
  { href: '/inicio', label: 'Inicio', icon: 'home' },
  { href: '/calendario', label: 'Agenda', icon: 'calendar' },
  { href: '/delivery', label: 'Delivery', icon: 'truck' },
  { href: '/metas', label: 'Metas', icon: 'target' },
  { href: '/asistente', label: 'Asistente', icon: 'message' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur"
      style={{
        background: 'rgb(var(--surface) / 0.9)',
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
                className="relative flex min-h-[56px] flex-col items-center justify-center gap-1"
                style={{ color: active ? 'rgb(var(--text))' : 'rgb(var(--muted))' }}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute top-0 h-0.5 w-8 rounded-full"
                    style={{ background: 'rgb(var(--text))' }}
                  />
                ) : null}
                <Icon name={it.icon} size={22} />
                <span className="text-[11px]" style={{ fontWeight: active ? 600 : 400 }}>
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
