"use client";

import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Summary = {
  focus: string;
  dayName: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exerciseVolumes?: number[]; // optional per-exercise volumes for the chart
};

// Draws a branded, shareable workout image in STORY format (1080x1920) with a
// volume bar chart and stat cards. Shares natively or downloads.
export function ShareWorkoutImage({ summary }: { summary: Summary }) {
  const [busy, setBusy] = useState(false);

  async function buildImage(): Promise<Blob | null> {
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0d1510");
    bg.addColorStop(0.5, "#0a0b0d");
    bg.addColorStop(1, "#0a0b0d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Green glow
    const glow = ctx.createRadialGradient(W / 2, 380, 60, W / 2, 380, 640);
    glow.addColorStop(0, "rgba(48,209,88,0.10)");
    glow.addColorStop(1, "rgba(48,209,88,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 900);

    // Logo badge
    const lx = W / 2 - 90, ly = 230, ls = 180;
    ctx.fillStyle = "#30d158";
    roundRect(ctx, lx, ly, ls, ls, 46);
    ctx.fill();
    ctx.fillStyle = "#04120a";
    ctx.globalAlpha = 0.55; roundRect(ctx, lx + 33, ly + 112, 27, 38, 9); ctx.fill();
    ctx.globalAlpha = 0.8;  roundRect(ctx, lx + 75, ly + 78, 27, 72, 9); ctx.fill();
    ctx.globalAlpha = 1;    roundRect(ctx, lx + 117, ly + 45, 27, 105, 9); ctx.fill();
    roundRect(ctx, lx + 99, ly + 30, 63, 16, 8); ctx.fill();

    // Wordmark — measured so "GymTrack" and "Pro" never overlap.
    ctx.textAlign = "left";
    ctx.font = "800 66px Arial, sans-serif";
    const part1 = "GymTrack";
    const part2 = " Pro";
    const w1 = ctx.measureText(part1).width;
    const w2 = ctx.measureText(part2).width;
    const totalW = w1 + w2;
    const startX = W / 2 - totalW / 2;
    ctx.fillStyle = "#f5f5f7";
    ctx.fillText(part1, startX, 510);
    ctx.fillStyle = "#30d158";
    ctx.fillText(part2, startX + w1, 510);

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#f5f5f7";
    ctx.font = "800 82px Arial, sans-serif";
    ctx.fillText("Workout complete", W / 2, 660);
    ctx.fillStyle = "#a1a1a6";
    ctx.font = "400 38px Arial, sans-serif";
    ctx.fillText(truncate(`${summary.focus} · ${summary.dayName}`, 42), W / 2, 720);

    // Volume bar chart
    ctx.fillStyle = "#6e6e73";
    ctx.font = "700 26px Arial, sans-serif";
    ctx.fillText("VOLUME BY EXERCISE", W / 2, 850);

    // Use real per-exercise volumes if provided, else a pleasant default shape.
    let vols = summary.exerciseVolumes && summary.exerciseVolumes.length > 0
      ? summary.exerciseVolumes.slice(0, 6)
      : [200, 280, 160, 320, 120];
    const maxVol = Math.max(...vols, 1);
    const chartBottom = 1185;
    const chartTop = 880;
    const chartH = chartBottom - chartTop;
    const barW = 110;
    const gap = 40;
    const totalBarsW = vols.length * barW + (vols.length - 1) * gap;
    let bx = W / 2 - totalBarsW / 2;
    const barGrad = ctx.createLinearGradient(0, chartBottom, 0, chartTop);
    barGrad.addColorStop(0, "#1a7a3a");
    barGrad.addColorStop(1, "#30d158");
    for (const v of vols) {
      const h = Math.max(20, (v / maxVol) * chartH);
      ctx.fillStyle = barGrad;
      roundRect(ctx, bx, chartBottom - h, barW, h, 14);
      ctx.fill();
      bx += barW + gap;
    }
    ctx.strokeStyle = "#2a2a2e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - totalBarsW / 2 - 30, chartBottom + 4);
    ctx.lineTo(W / 2 + totalBarsW / 2 + 30, chartBottom + 4);
    ctx.stroke();

    // Stat cards 2x2
    const stats: [string, string][] = [
      [`${summary.durationMinutes}m`, "DURATION"],
      [`${Math.round(summary.totalVolume).toLocaleString()}`, "KG LIFTED"],
      [`${summary.totalSets}`, "SETS"],
      [`${summary.totalReps}`, "REPS"],
    ];
    const cardW = 400, cardH = 170, cardGap = 40;
    const gridX = W / 2 - cardW - cardGap / 2;
    const gridY = 1280;
    stats.forEach(([value, label], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = gridX + col * (cardW + cardGap);
      const y = gridY + row * (cardH + cardGap);
      ctx.fillStyle = "#141518";
      roundRect(ctx, x, y, cardW, cardH, 28);
      ctx.fill();
      ctx.fillStyle = "#30d158";
      ctx.font = "800 70px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(value, x + cardW / 2, y + 92);
      ctx.fillStyle = "#6e6e73";
      ctx.font = "700 26px Arial, sans-serif";
      ctx.fillText(label, x + cardW / 2, y + 134);
    });

    // Footer
    ctx.fillStyle = "#6e6e73";
    ctx.font = "500 34px Arial, sans-serif";
    ctx.fillText("gymtrackpro.xyz", W / 2, 1780);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await buildImage();
      if (!blob) throw new Error();
      const file = new File([blob], "gymtrack-workout.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My workout", text: "Just crushed a workout on GymTrack Pro 💪" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gymtrack-workout.png";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Image saved — share it to your story!");
      }
    } catch {
      toast.error("Couldn't create the image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="lg" onClick={share} disabled={busy} className="pressable">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      Share to story
    </Button>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
