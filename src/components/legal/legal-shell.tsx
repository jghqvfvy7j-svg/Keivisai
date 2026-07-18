import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

// Shared shell for legal / info pages (terms, privacy, data deletion, support).
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-safe pb-2 lg:px-8 lg:pt-6">
        <Link href="/">
          <Logo variant="full" />
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>}
        <div className="legal-content mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
          {children}
        </div>

        <footer className="mt-16 border-t border-border pt-8">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
            <Link href="/support" className="hover:text-foreground">Support</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Small helper for section headings inside legal pages.
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-foreground">{heading}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}
