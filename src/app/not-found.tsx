import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <Logo variant="full" />
      <p className="font-score mt-10 text-6xl font-bold text-volt">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild size="lg" className="pressable mt-6">
        <Link href="/home">
          <Home className="h-4 w-4" /> Back to home
        </Link>
      </Button>
    </div>
  );
}
