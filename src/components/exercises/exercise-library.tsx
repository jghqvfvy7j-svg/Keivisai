"use client";

import type { ExerciseRow } from "@/lib/types/database";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Heart } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/atlas/panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ExerciseImage } from "@/components/exercises/exercise-image";
import { cn } from "@/lib/utils";
import { muscleLabels, equipmentLabels, difficultyLabels } from "@/lib/labels";
import type { MuscleGroup, Equipment, Difficulty } from "@/lib/types/database";

const muscleFilters = Object.entries(muscleLabels) as [MuscleGroup, string][];
const equipmentFilters = Object.entries(equipmentLabels) as [Equipment, string][];
const difficultyFilters = Object.entries(difficultyLabels) as [Difficulty, string][];

export function ExerciseLibrary({ exercises }: { exercises: ExerciseRow[] }) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (query && !ex.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (muscle !== "all" && ex.main_muscle !== muscle) return false;
      if (equipment !== "all" && !ex.equipment.includes(equipment)) return false;
      if (difficulty !== "all" && ex.difficulty !== difficulty) return false;
      return true;
    });
  }, [exercises, query, muscle, equipment, difficulty]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeFilterCount = [muscle, equipment, difficulty].filter((f) => f !== "all").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Library</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Exercises</h1>
        <p className="mt-1 text-sm text-text-2">{exercises.length} movements with form guides</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <Input
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="search"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="surface" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-signal text-[10px] font-bold text-signal-ink">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-5">
              <FilterGroup label="Muscle" options={[["all", "All"], ...muscleFilters]} value={muscle} onChange={(v) => setMuscle(v as MuscleGroup | "all")} />
              <FilterGroup label="Equipment" options={[["all", "All"], ...equipmentFilters]} value={equipment} onChange={(v) => setEquipment(v as Equipment | "all")} />
              <FilterGroup label="Difficulty" options={[["all", "All"], ...difficultyFilters]} value={difficulty} onChange={(v) => setDifficulty(v as Difficulty | "all")} />
              <Button variant="surface" onClick={() => { setMuscle("all"); setEquipment("all"); setDifficulty("all"); }}>
                Clear filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Muscle chip row */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[["all", "All"] as [string, string], ...muscleFilters].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMuscle(value as MuscleGroup | "all")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
              muscle === value
                ? "border-transparent bg-text text-bg"
                : "border-hairline bg-surface text-text-2 hover:text-text"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
        {filtered.map((ex) => (
          <div key={ex.id} className="relative">
            <Link href={`/library/${ex.slug}`}>
              <Panel interactive className="h-full overflow-hidden p-0">
                <ExerciseImage src={ex.image_url} alt={ex.name} muscle={ex.main_muscle} className="h-28 w-full rounded-none" />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight">{ex.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{muscleLabels[ex.main_muscle]}</Badge>
                    <Badge variant="default" className="text-[10px]">{difficultyLabels[ex.difficulty]}</Badge>
                  </div>
                </div>
              </Panel>
            </Link>
            <button
              onClick={() => toggleFavorite(ex.id)}
              aria-label="Save to favorites"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
            >
              <Heart className={cn("h-3.5 w-3.5", favorites.has(ex.id) ? "fill-bad text-bad" : "text-white")} />
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-text-2">
            No exercises match these filters. Try broadening your search.
          </p>
        )}
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              value === v ? "border-transparent bg-text text-bg" : "border-hairline bg-surface-2 text-text-2 hover:text-text"
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
