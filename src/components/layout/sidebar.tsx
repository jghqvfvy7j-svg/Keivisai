"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";
import { Logo } from "@/components/brand/logo";
import { LogOut, User, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const secondary = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/profile/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userName = "Athlete" }: { userName?: string }) {
  const pathname = usePathname();

  const linkCls = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return cn(
      "pressable flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
      active ? "bg-volt text-volt-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
    );
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <Logo variant="full" />
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={linkCls(item.href)}>
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <div className="mt-4 border-t border-border pt-4">
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkCls(item.href)}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3 py-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="truncate text-xs text-muted">View profile</p>
        </div>
        <Link href="/login" className="text-muted hover:text-foreground" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
