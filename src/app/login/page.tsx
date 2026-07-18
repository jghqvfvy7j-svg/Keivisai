"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Logo } from "@/components/brand/logo";
import { GoogleButton } from "@/components/auth/google-button";
import { PasskeyLogin } from "@/components/auth/passkey-login";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function resetPassword() {
    const email = getValues("email");
    if (!email || !email.includes("@")) {
      toast.error("Enter your email above first, then tap Forgot.");
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success("Check your email for a password reset link.");
    } catch {
      toast.error("Couldn't send reset email. Try again.");
    }
  }

  async function onSubmit(values: LoginInput) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
      router.push(params.get("redirect") || "/home");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? "Couldn't sign in. Check your email and password."
          : "Something went wrong."
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <Logo variant="full" />
        </Link>

        <h1 className="font-display text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to continue your progress.</p>

        {params.get("error") === "oauth" && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3">
            <p className="text-sm text-danger">Google sign-in didn&apos;t complete. Please try again.</p>
          </div>
        )}

        {params.get("offline") === "1" && (
          <div className="mt-4 rounded-xl border border-coral/40 bg-coral/10 p-3">
            <p className="text-sm font-semibold text-coral">Connection problem</p>
            <p className="mt-0.5 text-xs text-muted">
              We could not reach the server, so we could not confirm your session. You are not
              signed out. Check your connection, especially on public or guest wifi, then try again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@email.com" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={resetPassword}
                className="text-xs font-semibold text-volt hover:underline"
              >
                Forgot?
              </button>
            </div>
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-2">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton redirect={params.get("redirect") ?? undefined} />

        <PasskeyLogin />

        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-volt">
            Sign up
          </Link>
        </p>

        <div className="mt-8 flex justify-center gap-4 text-[11px] text-muted-2">
          <Link href="/terms" className="hover:text-muted">Terms</Link>
          <Link href="/privacy" className="hover:text-muted">Privacy</Link>
          <Link href="/support" className="hover:text-muted">Support</Link>
        </div>
      </div>
    </div>
  );
}
