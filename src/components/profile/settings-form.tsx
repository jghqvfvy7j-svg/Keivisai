"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, AlertTriangle, Sparkles, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PasskeyEnroll } from "@/components/auth/passkey-enroll";
import { NotificationToggle } from "@/components/pwa/notification-toggle";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { goalLabels } from "@/lib/labels";
import { APP_VERSION } from "@/lib/version";
import { kgToLbs, lbsToKg, cmToFeetInches, feetInchesToCm } from "@/lib/units";
import { saveProfile, changePassword, deleteAccount } from "@/app/(app)/profile/actions";
import type { Goal, UserProfileRow } from "@/lib/types/database";

export function SettingsForm({ profile }: { profile: UserProfileRow }) {
  const [name, setName] = useState(profile.name ?? "");
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [level, setLevel] = useState(profile.level ?? "principiante");
  const [trainingDays, setTrainingDays] = useState(profile.training_days ?? 4);
  const [injuries, setInjuries] = useState(profile.injuries ?? "");

  // Unit preferences (default to US units). These control display + input only;
  // values are always stored in metric (kg, cm).
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("lb");
  const [heightUnit, setHeightUnit] = useState<"cm" | "in">("in");

  // Weight is kept as a string in the CURRENTLY selected unit.
  const [weight, setWeight] = useState<string>(
    profile.current_weight_kg ? String(kgToLbs(profile.current_weight_kg)) : ""
  );
  const initialHeight = cmToFeetInches(profile.height_cm);
  const [heightFt, setHeightFt] = useState<string>(profile.height_cm ? String(initialHeight.ft) : "");
  const [heightIn, setHeightIn] = useState<string>(profile.height_cm ? String(initialHeight.inch) : "");
  const [heightCm, setHeightCm] = useState<string>(profile.height_cm ? String(profile.height_cm) : "");
  const [pending, startTransition] = useTransition();

  // Password change
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Account deletion
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function onChangePassword() {
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match."); return; }
    setChangingPw(true);
    try {
      const res = await changePassword(newPw);
      if (res.ok) {
        toast.success("Password updated.");
        setNewPw(""); setConfirmPw("");
      } else if (res.error === "weak_password") {
        toast.error("Password is too weak.");
      } else {
        toast.error("Couldn't update password. Try signing in again first.");
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setChangingPw(false);
    }
  }

  async function onDeleteAccount() {
    if (deleteConfirm !== "DELETE") { toast.error("Type DELETE to confirm."); return; }
    setDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.ok) {
        toast.success("Your account and data were deleted.");
        window.location.href = "/";
      } else {
        toast.error("Couldn't delete account. Email soporte@gymtrackpro.xyz for help.");
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  // Convert weight value when the user switches unit, so the number stays correct.
  function switchWeightUnit(next: "kg" | "lb") {
    if (next === weightUnit) return;
    const val = Number(weight);
    if (weight && !Number.isNaN(val)) {
      const kg = weightUnit === "kg" ? val : lbsToKg(val);
      setWeight(String(next === "kg" ? kg : kgToLbs(kg)));
    }
    setWeightUnit(next);
  }

  function switchHeightUnit(next: "cm" | "in") {
    if (next === heightUnit) return;
    if (next === "cm") {
      // from ft/in -> cm
      if (heightFt || heightIn) setHeightCm(String(feetInchesToCm(Number(heightFt || 0), Number(heightIn || 0))));
    } else {
      // from cm -> ft/in
      if (heightCm) {
        const fi = cmToFeetInches(Number(heightCm));
        setHeightFt(String(fi.ft));
        setHeightIn(String(fi.inch));
      }
    }
    setHeightUnit(next);
  }

  function save() {
    startTransition(async () => {
      try {
        // Always persist metric.
        const weightKg = weight
          ? (weightUnit === "kg" ? Number(weight) : lbsToKg(Number(weight)))
          : null;
        const heightCmValue =
          heightUnit === "cm"
            ? (heightCm ? Number(heightCm) : null)
            : ((heightFt || heightIn) ? feetInchesToCm(Number(heightFt || 0), Number(heightIn || 0)) : null);

        const res = await saveProfile({
          name,
          goal,
          level,
          injuries: injuries.trim() || null,
          training_days: trainingDays,
          current_weight_kg: weightKg,
          height_cm: heightCmValue,
        });
        if (res.ok) toast.success("Changes saved.");
        else if (res.error === "not_authenticated" || res.error === "not_connected")
          toast.error("Sign in with Supabase connected to save changes.");
        else toast.error("Couldn't save. Please try again.");
      } catch {
        // A network or firewall failure rejects the action promise. Without this
        // guard the rejection bubbles up to the error boundary and blanks the
        // whole screen after a save. Show a toast and stay on the page instead.
        toast.error("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <Link href="/profile" className="hidden items-center gap-1.5 pt-2 text-sm font-semibold text-muted lg:flex">
        <ArrowLeft className="h-4 w-4" /> Profile
      </Link>

      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Account</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Current weight</Label>
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(["kg", "lb"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => switchWeightUnit(u)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold transition-colors",
                      weightUnit === u ? "bg-volt text-volt-foreground" : "bg-surface-2 text-muted"
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={weightUnit === "lb" ? "e.g. 160" : "e.g. 72.5"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Height</Label>
              <div className="flex overflow-hidden rounded-lg border border-border">
                {(["cm", "in"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => switchHeightUnit(u)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold transition-colors",
                      heightUnit === u ? "bg-volt text-volt-foreground" : "bg-surface-2 text-muted"
                    )}
                  >
                    {u === "in" ? "ft/in" : "cm"}
                  </button>
                ))}
              </div>
            </div>
            {heightUnit === "cm" ? (
              <Input
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 175"
              />
            ) : (
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-1.5">
                  <Input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} placeholder="5" />
                  <span className="text-sm text-muted">ft</span>
                </div>
                <div className="flex flex-1 items-center gap-1.5">
                  <Input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="9" />
                  <span className="text-sm text-muted">in</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Security</p>
        <PasskeyEnroll />
        <p className="mt-2 text-[11px] text-muted">
          Add a passkey to sign in with Face ID, fingerprint or your device key, with no password to remember or leak.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <Label>Change password</Label>
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password (min 8 chars)"
          />
          <Input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
          />
          <Button
            variant="secondary"
            onClick={onChangePassword}
            disabled={changingPw || !newPw || !confirmPw}
            className="pressable"
          >
            {changingPw && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Appearance</p>
        <ThemeToggle />
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Goal</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(goalLabels) as [Goal, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setGoal(value)}
              className={cn(
                "pressable rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                goal === value ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Weekly availability</p>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              onClick={() => setTrainingDays(d)}
              className={cn(
                "pressable h-11 flex-1 rounded-2xl border text-sm font-bold transition-colors",
                trainingDays === d ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-muted"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Experience level</p>
        <div className="flex flex-wrap gap-2">
          {([
            ["principiante", "Beginner"],
            ["intermedio", "Intermediate"],
            ["avanzado", "Advanced"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setLevel(value)}
              className={cn(
                "pressable rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                level === value ? "border-volt bg-volt text-volt-foreground" : "border-border bg-surface-2 text-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Injuries or limitations</p>
        <Input
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
          placeholder="e.g. lower back, right knee (optional)"
        />
        <p className="mt-1.5 text-[11px] text-muted">
          The coach uses this to avoid risky exercises and suggest alternatives.
        </p>
      </section>

      <Button size="lg" onClick={save} disabled={pending} className="pressable">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>

      <Separator />

      <Link
        href="/upgrade"
        className="pressable flex items-center justify-between rounded-2xl border border-volt/30 bg-volt/5 p-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt/15 text-volt">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Upgrade to Pro</p>
            <p className="text-xs text-muted">More AI, more plans, priority features</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted" />
      </Link>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Notifications</p>
        <NotificationToggle />
        <p className="mt-2 text-[11px] text-muted">
          Get reminders to train and stay consistent. Works best when the app is installed.
        </p>
      </section>

      <Separator />

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Support &amp; legal</p>
        <div className="flex flex-col gap-2">
          <a
            href="mailto:soporte@gymtrackpro.xyz?subject=GymTrack%20Pro%20Support"
            className="pressable flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3.5"
          >
            <Mail className="h-4 w-4 text-volt" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Contact support</p>
              <p className="text-xs text-muted">soporte@gymtrackpro.xyz</p>
            </div>
          </a>
          <a
            href="/api/export"
            className="pressable flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3.5"
          >
            <Download className="h-4 w-4 text-volt" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Export my data</p>
              <p className="text-xs text-muted">Download all your data as JSON</p>
            </div>
          </a>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
            <a href="/terms" className="hover:text-foreground">Terms</a>
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/data-deletion" className="hover:text-foreground">Data deletion</a>
            <a href="/support" className="hover:text-foreground">Support center</a>
          </div>
        </div>
      </section>

      <Separator />

      {/* Danger zone */}
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">Danger zone</p>
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-danger" /> Delete account
          </p>
          <p className="mt-1 text-xs text-muted">
            Permanently deletes your profile, workouts, nutrition, measurements and coach chats.
            This can&apos;t be undone. Type <strong className="text-foreground">DELETE</strong> to confirm.
          </p>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="mt-3"
          />
          <Button
            onClick={onDeleteAccount}
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="pressable mt-2 w-full bg-danger text-white hover:bg-danger/90"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete my account
          </Button>
        </div>
      </section>

      <p className="pt-2 text-center text-[11px] text-muted-2">
        GymTrack Pro · version {APP_VERSION}
      </p>
    </div>
  );
}
