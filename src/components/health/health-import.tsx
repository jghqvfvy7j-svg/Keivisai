"use client";

import { PrivacyNote } from "@/components/ui/privacy-note";
import { useState, useRef } from "react";
import { Heart, Loader2, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { unzip } from "fflate";
import { Card, CardContent } from "@/components/ui/card";

// Lets the user import their Apple Health export (.zip). We extract export.xml
// in the browser, then send it to the server to parse and store.
export function HealthImport({ onImported }: { onImported?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ workouts: number; heartDays: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (busy) return;
    setBusy(true);
    setDone(null);
    try {
      // Guard: some huge exports can crash the browser tab. Warn if very large.
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 500) {
        toast.error("That file is very large. Try again, it may take a moment.");
      }

      let buf: Uint8Array;
      try {
        buf = new Uint8Array(await file.arrayBuffer());
      } catch {
        toast.error("Couldn't read the file. Make sure it finished downloading.");
        return;
      }

      // Extract export.xml from the zip.
      let fullXml: string;
      try {
        fullXml = await new Promise<string>((resolve, reject) => {
          unzip(buf, (err, files) => {
            if (err) return reject(err);
            const key = Object.keys(files).find((k) => k.endsWith("export.xml"));
            if (!key) return reject(new Error("no_export_xml"));
            resolve(new TextDecoder().decode(files[key]));
          });
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "no_export_xml") {
          toast.error("That zip has no export.xml. Pick the file from Apple Health's Export.");
        } else {
          toast.error("That doesn't look like a valid .zip. Re-export from Health and try again.");
        }
        return;
      }

      // Filter down to just workouts (small) and aggregate heart data into daily
      // summaries IN THE BROWSER, so the upload stays tiny (well under any limit).
      const workoutMatches = fullXml.match(/<Workout\s[\s\S]*?<\/Workout>|<Workout\s[^>]*\/>/g) || [];

      // Aggregate heart-rate records by day here instead of shipping them all.
      const hrRe = /<Record\s+type="HKQuantityTypeIdentifier(HeartRate|RestingHeartRate)"[^>]*?value="([\d.]+)"[^>]*?startDate="([^"]+)"/g;
      const hrByDay = new Map<string, number[]>();
      const restByDay = new Map<string, number[]>();
      let hm: RegExpExecArray | null;
      while ((hm = hrRe.exec(fullXml)) !== null) {
        const day = hm[3].slice(0, 10);
        const val = Math.round(parseFloat(hm[2]));
        const map = hm[1] === "RestingHeartRate" ? restByDay : hrByDay;
        if (!map.has(day)) map.set(day, []);
        const arr = map.get(day)!;
        if (arr.length < 500) arr.push(val); // cap per day, plenty for an average
      }
      const heartDaily = [...new Set([...hrByDay.keys(), ...restByDay.keys()])].map((day) => {
        const hrs = hrByDay.get(day) ?? [];
        const rest = restByDay.get(day) ?? [];
        return {
          day,
          resting_hr: rest.length ? Math.round(rest.reduce((a, b) => a + b, 0) / rest.length) : null,
          avg_hr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
          max_hr: hrs.length ? Math.max(...hrs) : null,
        };
      });

      const xml = `<HealthData>\n${workoutMatches.join("\n")}\n</HealthData>`;

      if (workoutMatches.length === 0 && heartDaily.length === 0) {
        toast.error("No workouts or heart-rate data found in that export.");
        return;
      }

      let res: Response;
      try {
        res = await fetch("/api/health/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ xml, heartDaily }),
        });
      } catch {
        toast.error("Network error while uploading. Check your connection and retry.");
        return;
      }

      if (!res.ok && res.status !== 200) {
        toast.error(`Upload failed (${res.status}). Try a smaller export or retry.`);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        setDone({ workouts: data.workouts, heartDays: data.heartDays });
        toast.success(`Imported ${data.workouts} workouts.`);
        onImported?.();
      } else if (data.error === "not_authenticated") {
        toast.error("Please sign in first.");
      } else if (data.error === "not_connected") {
        toast.error("The app isn't connected to the database yet.");
      } else {
        toast.error("Couldn't import that file. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-coral" />
          <p className="font-display text-sm font-bold">Apple Health</p>
        </div>
        <p className="mt-2 text-xs text-muted">
          Import your heart rate, distance and workouts from Apple Health.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed,application/octet-stream"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {done ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-volt/30 bg-volt/5 p-3.5 text-sm">
            <Check className="h-4 w-4 text-volt" />
            <span>Imported {done.workouts} workouts and {done.heartDays} days of heart data.</span>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="pressable mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-volt" />}
            {busy ? "Importing…" : "Upload Health export (.zip)"}
          </button>
        )}

        <div className="mt-2">
          <PrivacyNote>Your health data is encrypted and private to your account.</PrivacyNote>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted">How to export from Apple Health</summary>
          <ol className="mt-2 list-decimal pl-4 text-xs text-muted">
            <li>Open the <strong>Health</strong> app on your iPhone.</li>
            <li>Tap your <strong>profile picture</strong> (top right).</li>
            <li>Scroll down and tap <strong>Export All Health Data</strong>.</li>
            <li>Wait for it to prepare, then <strong>Save to Files</strong>.</li>
            <li>Come back here and upload that <strong>.zip</strong> file.</li>
          </ol>
        </details>
      </CardContent>
    </Card>
  );
}
