"use client";

import { GoogleButton } from "@/components/auth/google-button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, passwordStrength, type RegisterInput } from "@/lib/validations/auth";
import { Logo } from "@/components/brand/logo";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const pwValue = watch("password") ?? "";
  const strength = passwordStrength(pwValue);

  async function onSubmit(values: RegisterInput) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { name: values.name } },
      });
      if (error) throw error;
      toast.success("Account created. Let's set up your training profile.");
      router.push("/onboarding");
    } catch {
      toast.error("Couldn't create your account. Please try again.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <Logo variant="full" />
        </Link>

        <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Start tracking your progress today.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@email.com" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            {pwValue && (
              <div className="mt-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={
                        "h-1 flex-1 rounded-full transition-colors " +
                        (i < strength.score
                          ? strength.score <= 1 ? "bg-danger"
                            : strength.score === 2 ? "bg-warning"
                            : "bg-volt"
                          : "bg-surface-3")
                      }
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted">{strength.label}</p>
              </div>
            )}
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
            {errors.confirmPassword && (
              <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-muted-2">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="font-semibold text-muted underline">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-muted underline">Privacy Policy</Link>.
          </p>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-2">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton />

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-volt">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
