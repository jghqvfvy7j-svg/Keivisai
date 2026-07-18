// Sube las imágenes de ejercicios al bucket público `exercise-media` de Supabase.
//
// Uso (desde la carpeta que contiene ./exercise-media):
//   SUPABASE_URL=https://TU-PROYECTO.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxxxx \
//   node scripts/subir_exercise_media.mjs ./exercise-media
//
// El service role key NO se guarda en el repo: se pasa como variable de entorno
// solo al correr el script en tu máquina. Sube preservando las rutas
// (exercises/<Nombre>/N.jpg) y hace upsert (re-correrlo es seguro).
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, posix, sep } from "node:path";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ROOT = process.argv[2] || "./exercise-media";
const BUCKET = "exercise-media";
const CONCURRENCY = 8;

if (!URL || !KEY) {
  console.error("Falta SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(jpg|jpeg|png|webp)$/i.test(name)) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
console.log(`Encontrados ${files.length} archivos. Subiendo a "${BUCKET}"...`);
let done = 0, failed = 0;

async function upload(file) {
  // clave dentro del bucket = ruta relativa a ROOT, con separadores "/"
  const key = relative(ROOT, file).split(sep).join(posix.sep);
  const body = await readFile(file);
  const ext = key.split(".").pop().toLowerCase();
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
    contentType, upsert: true, cacheControl: "31536000",
  });
  if (error) { failed++; console.error("  ✗", key, error.message); }
  else { done++; if (done % 50 === 0) console.log(`  ${done}/${files.length}`); }
}

// pool de concurrencia simple
const queue = [...files];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await upload(queue.pop());
}));

console.log(`Listo. Subidas: ${done}  Fallidas: ${failed}`);
process.exit(failed ? 1 : 0);
