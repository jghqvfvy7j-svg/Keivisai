#!/usr/bin/env node
/**
 * Traduce al español las instrucciones/descripciones del dataset free-exercise-db
 * y genera supabase/seed.es.sql (873 ejercicios, instrucciones en español).
 *
 * POR QUÉ EXISTE: el dataset original está en inglés. El seed.sql incluido
 * funciona tal cual (instrucciones en inglés). Si quieres las instrucciones en
 * español, ejecuta este script EN TU PROPIA MÁQUINA (no en entornos con red
 * restringida).
 *
 * USO:
 *   cd scripts
 *   node translate-seed.mjs
 *   # genera ../supabase/seed.es.sql -> ejecútalo en Supabase en lugar de seed.sql
 *
 * Usa la API gratuita de MyMemory (~5.000 palabras/día sin clave). Para 873
 * ejercicios necesitarás correrlo varias veces (guarda caché en translations.json
 * y reanuda). Alternativa de mayor calidad: DeepL API (500k chars/mes gratis).
 */

import fs from "node:fs";
import path from "node:path";

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";
const DATASET_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const CACHE_FILE = "translations.json";
const OUT = path.join("..", "supabase", "seed.es.sql");

// --- Mapeos dataset (inglés) -> enums español del esquema ---
const muscleMap = { abdominals:"abdomen", abductors:"piernas", adductors:"piernas", biceps:"biceps", calves:"piernas", chest:"pecho", forearms:"biceps", glutes:"gluteos", hamstrings:"piernas", lats:"espalda", "lower back":"espalda", "middle back":"espalda", neck:"hombros", quadriceps:"piernas", shoulders:"hombros", traps:"espalda", triceps:"triceps" };
const equipMap = { bands:["bandas"], barbell:["barras","gimnasio_completo"], "body only":["peso_corporal","casa"], cable:["maquinas","gimnasio_completo"], dumbbell:["mancuernas"], "e-z curl bar":["barras","gimnasio_completo"], "exercise ball":["casa"], "foam roll":["casa"], kettlebells:["mancuernas"], machine:["maquinas","gimnasio_completo"], "medicine ball":["casa"], other:["gimnasio_completo"] };
const levelMap = { beginner:"principiante", intermediate:"intermedio", expert:"avanzado" };
const typeMap = { strength:"fuerza", "olympic weightlifting":"fuerza", powerlifting:"fuerza", strongman:"fuerza", plyometrics:"fuerza", cardio:"cardio", stretching:"movilidad" };
const forceMap = { push:"Empuje", pull:"Tirón", static:"Estático" };
const mechanicMap = { compound:"Compuesto", isolation:"Aislamiento" };

function rec(cat, level) {
  if (cat === "cardio") return { sets: 3, reps: "30-45 seg", rest: 45 };
  if (cat === "stretching") return { sets: 2, reps: "20-30 seg", rest: 30 };
  if (cat === "powerlifting" || cat === "olympic weightlifting") return { sets: 5, reps: "3-5", rest: 180 };
  if (level === "beginner") return { sets: 3, reps: "10-12", rest: 75 };
  return { sets: 4, reps: "8-12", rest: 90 };
}

const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};
function saveCache() { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translate(text) {
  if (!text || !text.trim()) return text;
  if (cache[text]) return cache[text];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
  const res = await fetch(url);
  const json = await res.json();
  const out = json?.responseData?.translatedText || text;
  cache[text] = out;
  await sleep(250); // respeta el rate limit
  return out;
}

const esc = (s) => (s == null ? "" : String(s).replace(/'/g, "''"));
const arrTyped = (a, t) => (a.length ? `ARRAY[${a.map((x) => `'${esc(x)}'`).join(",")}]::${t}[]` : `ARRAY[]::${t}[]`);
const seen = new Set();
function slug(id) { let s = id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); let b = s, i = 1; while (seen.has(s)) s = `${b}-${i++}`; seen.add(s); return s; }

async function main() {
  console.log("Descargando dataset...");
  const data = await (await fetch(DATASET_URL)).json();
  console.log(`${data.length} ejercicios. Traduciendo (esto tarda; usa la caché para reanudar)...`);

  const rows = [];
  for (let i = 0; i < data.length; i++) {
    const e = data[i];
    const mm = muscleMap[e.primaryMuscles?.[0]] || "full_body";
    const sec = [...new Set((e.secondaryMuscles || []).map((m) => muscleMap[m]).filter(Boolean).filter((m) => m !== mm))];
    const eq = [...new Set(equipMap[e.equipment] || ["gimnasio_completo"])];
    const r = rec(e.category, e.level);
    const imgs = (e.images || []).map((x) => CDN + x);
    const f = e.force ? forceMap[e.force] : null;
    const mech = e.mechanic ? mechanicMap[e.mechanic] : null;

    const instructionsEs = [];
    for (const step of e.instructions || []) instructionsEs.push(await translate(step));
    const nameEs = await translate(e.name);

    rows.push({
      name: nameEs, slug: slug(e.id),
      description: (f ? `Ejercicio de ${f.toLowerCase()}` : "Ejercicio") + (mech ? `, ${mech.toLowerCase()}` : "") + ".",
      instructions: instructionsEs, main_muscle: mm, secondary_muscles: sec, equipment: eq,
      difficulty: levelMap[e.level] || "principiante", type: typeMap[e.category] || "fuerza",
      image_url: imgs[0] || null, images: imgs, force: f, mechanic: mech,
      recommended_sets: r.sets, recommended_reps: r.reps, recommended_rest_seconds: r.rest,
    });

    if (i % 10 === 0) { saveCache(); process.stdout.write(`\r${i}/${data.length}`); }
  }
  saveCache();

  const cols = `(name, slug, description, instructions, main_muscle, secondary_muscles, equipment, difficulty, type, image_url, images, force, mechanic, common_mistakes, tips, recommended_sets, recommended_reps, recommended_rest_seconds, alternatives)`;
  let sql = `-- seed en español (generado por translate-seed.mjs)\n\n`;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    sql += `insert into exercises ${cols} values\n`;
    sql += rows.slice(i, i + BATCH).map((r) =>
      `('${esc(r.name)}','${esc(r.slug)}','${esc(r.description)}',${arrTyped(r.instructions,"text")},'${r.main_muscle}',${arrTyped(r.secondary_muscles,"muscle_group_type")},${arrTyped(r.equipment,"equipment_type")},'${r.difficulty}','${r.type}',${r.image_url?`'${esc(r.image_url)}'`:"null"},${arrTyped(r.images,"text")},${r.force?`'${esc(r.force)}'`:"null"},${r.mechanic?`'${esc(r.mechanic)}'`:"null"},ARRAY[]::text[],ARRAY[]::text[],${r.recommended_sets},'${esc(r.recommended_reps)}',${r.recommended_rest_seconds},ARRAY[]::text[])`
    ).join(",\n");
    sql += `\non conflict (slug) do nothing;\n\n`;
  }
  fs.writeFileSync(OUT, sql);
  console.log(`\nListo: ${OUT} (${rows.length} ejercicios en español).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
