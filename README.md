# GymTrack Pro

Plataforma de entrenamiento de gimnasio: rutinas, biblioteca de ejercicios,
progreso físico y alimentación. Construida mobile-first, lista para
convertirse en PWA.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase
(Postgres + Auth + Storage) · Recharts · Radix UI · React Hook Form + Zod.

## Estado actual

Este repositorio implementa la **Fase 1 a 4** de la interfaz (UI completa,
16 pantallas, navegación, componentes y lógica de cliente) con **datos de
muestra** (`src/lib/mock-data.ts`) para que puedas ver y probar la app de
inmediato sin configurar nada. El esquema de base de datos, las políticas de
seguridad (RLS) y los clientes de Supabase ya están listos — conectar un
proyecto real es el siguiente paso (ver abajo).

## Primeros pasos

```bash
npm install
npm run dev
```

Abre http://localhost:3000. La app funciona de inmediato con datos de
muestra (perfil, rutina, ejercicios, progreso) aunque no hayas conectado
Supabase todavía.

## Conectar Supabase (backend real)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `.env.local.example` a `.env.local` y completa las variables con
   los datos de tu proyecto (Project Settings → API).
3. Ejecuta el esquema en el SQL Editor de Supabase, en este orden:
   - `supabase/schema.sql` — tablas, enums, RLS, triggers y buckets de Storage.
   - `supabase/seed.sql` — ejercicios iniciales (20 ejercicios across todos
     los grupos musculares).
4. Para marcar un usuario como administrador (puede editar la biblioteca de
   ejercicios), añade `{"role": "admin"}` a `raw_app_meta_data` en
   `auth.users` desde el dashboard de Supabase.
5. Reemplaza las importaciones de `@/lib/mock-data` por consultas reales a
   Supabase. Las formas de los datos ya coinciden 1:1 con las tablas, así
   que el cambio es mecánico. Por ejemplo, en `dashboard/page.tsx`:

   ```ts
   // antes
   import { mockProfile } from "@/lib/mock-data";

   // después
   const supabase = await createClient();
   const { data: profile } = await supabase
     .from("users_profiles")
     .select("*")
     .single();
   ```

6. El middleware (`src/proxy.ts`) ya protege todas las rutas privadas y
   redirige a `/login` cuando no hay sesión — funciona automáticamente en
   cuanto las variables de entorno estén configuradas.


## Biblioteca de ejercicios (873 ejercicios con imágenes)

La app usa **free-exercise-db** (yuhonas), un dataset de **dominio público**
(Unlicense) con **873 ejercicios**, instrucciones paso a paso e imágenes reales.

- **Las imágenes NO hay que subirlas.** Se sirven gratis desde jsDelivr
  (CDN de GitHub), sin clave ni límites. Cada ejercicio trae 1-2 fotos
  (posición inicial y final) que el detalle muestra en un carrusel.
- El seed `supabase/seed.sql` ya contiene los 873 ejercicios listos para
  insertar. Solo ejecútalo en Supabase (paso 2 de "Conectar Supabase").
- **Idioma de las instrucciones:** el dataset original está en inglés. Los
  ejercicios de la vista previa (mock-data) están traducidos al español a mano.
  El seed completo trae las instrucciones en inglés. Si las quieres en español,
  ejecuta `scripts/translate-seed.mjs` en tu máquina (genera `seed.es.sql`);
  usa una API de traducción gratuita, así que tarda un rato y conviene correrlo
  fuera de entornos con red restringida.

### ¿Cómo se ven las imágenes si un ejercicio no tiene foto?

El componente `ExerciseImage` muestra la foto real y, si falla la carga o no
hay imagen, cae elegantemente a un mosaico de color por grupo muscular. Nunca
se rompe el diseño.




## v0.2 — Premium redesign (English) + AI Coach

- **New design system ("Atlas")**: near-black surfaces, hairline borders,
  Apple-green signal color, glass surfaces, instrument-style tabular numerals,
  motion (fade-up staggering, press/lift micro-interactions, skeletons,
  reduced-motion support). Tokens in `src/app/globals.css`.
- **Everything in English**: all screens, routes renamed
  (`/home`, `/workouts`, `/library`, `/nutrition`, `/progress`, `/body`,
  `/profile`, `/session`, `/coach`, `/signup`).
- **Insight-first Home**: readiness ring, today's focus, calories/protein
  remaining, next-PR prediction, coach insight card.
- **AI Coach (real)**: `/coach` chats with Claude via `/api/coach`.
  Set `ANTHROPIC_API_KEY` in Vercel (server-side env var). Optional
  `ANTHROPIC_MODEL` override. Without the key, the coach explains how to
  connect it instead of breaking.


## Estado: conectado a Supabase (lectura de ejercicios)

Las páginas de **biblioteca de ejercicios** (`/ejercicios`) y **detalle**
(`/ejercicios/[slug]`) ya leen de Supabase. La lógica está en `src/lib/data.ts`:
si las variables de entorno de Supabase están definidas, lee los ejercicios
reales; si no, usa datos de muestra (así la app nunca se rompe en local).

### Para que funcione en Vercel
Define en Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
y haz Redeploy. La biblioteca mostrará automáticamente los 175 ejercicios
cargados en tu base de datos, con imágenes.

### Pendiente (siguiente iteración)
El dashboard, rutina, progreso, medidas y alimentación todavía usan datos de
muestra para las partes que dependen de sesiones/registros del usuario. Se
migran igual que los ejercicios cuando quieras, añadiendo funciones a
`src/lib/data.ts` y guardando desde los formularios.


## Arquitectura

```
src/
  app/
    page.tsx                 Landing
    login/                   Inicio de sesión
    registro/                Registro
    onboarding/               Wizard de perfil físico (7 pasos)
    entrenamiento/            Pantalla de entrenamiento activo (focus mode)
      resumen/                 Resumen al finalizar
    (app)/                    Rutas con AppShell (sidebar + bottom nav)
      dashboard/
      ejercicios/
        [slug]/                Detalle de ejercicio
      rutina/
        crear/                 Generador de rutina (reglas simples)
      progreso/
      medidas/                 Peso corporal y medidas
      alimentacion/
      perfil/
        configuracion/
  components/
    ui/                       Primitivos estilo shadcn (Radix + cva)
    layout/                   AppShell, Sidebar, BottomNav
    exercises/, dashboard/, progress/
  lib/
    supabase/                 Clientes browser/server + middleware
    types/database.ts         Tipos que reflejan supabase/schema.sql
    validations/               Esquemas Zod (auth, onboarding)
    mock-data.ts               Datos de muestra para previsualizar
    labels.ts                  Etiquetas en español para los enums
supabase/
  schema.sql                  Esquema completo + RLS + Storage
  seed.sql                    Ejercicios iniciales
```

## Diseño

Concepto visual: **"marcador" (scoreboard)** — superficies oscuras tipo piso
de gimnasio, un único acento volt-lime para acciones primarias y progreso,
coral para nutrición/energía. Los números (peso, reps, temporizador de
descanso) usan tipografía monoespaciada tabular para leerse como un
marcador deportivo. Tokens en `src/app/globals.css`.

## Próximas fases (no incluidas todavía)

- **Fase 5 — PWA real:** generar `public/icons/icon-192.png` y
  `icon-512.png`, registrar un Service Worker (p. ej. con `next-pwa` o
  `serwist`) para modo offline básico y notificaciones push.
- **IA avanzada:** reemplazar las reglas simples de `rutina/crear` y el
  "sugerencia del día" del dashboard por recomendaciones basadas en
  historial real vía la API de Anthropic u otro proveedor.
- **Subida real de imágenes:** conectar `ExerciseTile` y el formulario de
  fotos de progreso al bucket de Storage ya creado en `schema.sql`.
- **Tests:** no incluidos en este alcance; se recomienda Playwright para
  flujos críticos (onboarding, entrenamiento activo) y Vitest para lógica
  de utilidades.

## Aviso

GymTrack Pro ofrece orientación general de entrenamiento y nutrición. No
sustituye el consejo de un profesional médico o nutricional.
