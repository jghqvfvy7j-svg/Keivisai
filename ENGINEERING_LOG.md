# Engineering Log

> **Documento INTERNO.** Detalle técnico por versión. No exponer secretos,
> tokens, variables privadas ni detalles que faciliten ataques. Resúmenes de más
> alto nivel en `RELEASE_NOTES.md` y `CHANGELOG.md` (públicos).

Estructura por entrada: **Contexto · Síntoma · Causa raíz · Solución · Decisión
de arquitectura · Archivos modificados · Seguridad · Pruebas realizadas · Riesgos
y rollback.**

---

## GK-017 · 1.0.60 — Accesibilidad: contraste (WCAG AA)

- **Contexto.** Pase de accesibilidad enfocado en contraste de texto y áreas táctiles.
- **Síntoma.** El token `--muted-2` (texto secundario tenue) no cumplía AA.
- **Causa raíz.** Medición: oscuro `#5f646b` daba 2.83 en surface-2 y 2.54 en
  surface-3 (<4.5). Claro `#9298a1` ~3.6 en blanco.
- **Solución.** Subir `--muted-2` al mínimo que pasa 4.5:1 en tarjetas sin dejar de
  ser secundario: oscuro `#8b9099` (s2=5.26, s3=4.71, bg=6.14), claro `#6b7079`
  (blanco=4.98). `foreground/muted/volt/coral` ya cumplían; no se tocaron.
- **Decisión de arquitectura.** Ver ADR-015. Fix centralizado en tokens (aplica a
  toda la app). Se aceptó aplanar un poco la jerarquía de grises a cambio de
  legibilidad (WCAG manda para texto real).
- **Archivos modificados.** `src/app/globals.css`.
- **Seguridad.** Sin impacto.
- **Pruebas realizadas.** Cálculo de ratios WCAG (script); `next build` en verde;
  áreas táctiles verificadas >=24px (WCAG 2.2 AA).
- **Riesgos y rollback.** Bajo. Rollback = revertir los 2 valores.

---

## GK-016 · 1.0.59 — Firma consistente en Progreso

- **Contexto.** El "encendido" estaba en Home y Nutrición; Progreso seguía estático.
- **Síntoma.** Inconsistencia entre las pantallas de datos.
- **Causa raíz.** `WeeklyRecap` renderizaba los stats como strings sin animación.
- **Solución.** `WeeklyRecap` (ya era client) ahora usa valores numéricos +
  `CountUp` (con `format` para el volumen) y lleva la hairline volt de firma, igual
  que la tarjeta principal del Home.
- **Decisión de arquitectura.** Continúa ADR-014. La firma de movimiento se cierra
  en las 3 pantallas de datos y NO se extiende más (disciplina "menos es más").
- **Archivos modificados.** `src/components/progress/weekly-recap.tsx`.
- **Seguridad.** Solo presentación; datos del propio usuario.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde.
- **Riesgos y rollback.** Bajo. Rollback = redeploy anterior.

---

## GK-015 · 1.0.58 — El Home enciende (count-up + detalle firma)

- **Contexto.** La firma de movimiento (GK-014) vivía solo en el anillo de
  Nutrición; el inicio seguía estático.
- **Síntoma.** Inconsistencia: una pantalla "instrumento", el resto plano.
- **Causa raíz.** El count-up no se había extendido al Home.
- **Solución.** `CountUp` ahora acepta `format` (para "Xk" y "+Y%"). Se aplicó a
  los 3 stats del Home (workouts, volumen, delta) y a la racha, como islas
  cliente dentro del server component. Detalle firma: hairline volt en la tarjeta
  principal (plan de hoy) con `overflow-hidden` + un div absoluto.
- **Decisión de arquitectura.** Continúa ADR-014. UN solo momento orquestado
  (encendido) y UN acento por pantalla; se respeta reduce-motion (en CountUp).
- **Archivos modificados.** `src/components/ui/count-up.tsx`,
  `src/app/(app)/home/page.tsx`.
- **Seguridad.** Solo presentación; datos del propio usuario.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde.
- **Riesgos y rollback.** Bajo. Rollback = redeploy anterior.

---

## GK-014 · 1.0.57 — Identidad visual: tipografía + firma de movimiento

- **Contexto.** La app usaba SOLO fuentes del sistema (SF Pro / SF Mono), lo que
  la hacía leerse como "app de IA por default" (fondo oscuro + acento verde, sin
  tipografía propia).
- **Síntoma.** Falta de identidad tipográfica; poca personalidad de marca.
- **Causa raíz.** `--font-display` y `--font-mono` apuntaban a stacks del sistema.
- **Solución.** Fuentes auto-hospedadas vía `next/font/local` (variables TTF
  bajadas del repo de Google Fonts, sin dependencia de Google en runtime):
  Space Grotesk (display) y JetBrains Mono (datos). Tokens re-cableados; el cuerpo
  sigue en system font. Firma de movimiento: `CountUp` (rAF, easeOutCubic,
  respeta reduce-motion) + el anillo dibuja su arco desde 0 al montar.
- **Decisión de arquitectura.** Ver ADR-014. La marca fija oscuro+volt (no se
  toca); la distinción se gasta en tipografía y UN momento de movimiento
  (instrumento encendiendo), como pide la disciplina de diseño ("boldness en un
  solo lugar"). Cambio centralizado en tokens = aplica a toda la app, bajo riesgo.
- **Archivos modificados.** `src/app/fonts/SpaceGrotesk.ttf`,
  `src/app/fonts/JetBrainsMono.ttf` (nuevas), `src/app/layout.tsx`,
  `src/app/globals.css`, `src/components/ui/count-up.tsx` (nuevo),
  `src/components/nutrition/calorie-ring.tsx`.
- **Seguridad.** Fuentes auto-hospedadas (sin llamadas a Google, mejor privacidad).
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde con fuentes locales
  (sin red); vistas previas de tipografía y anillo renderizadas.
- **Riesgos y rollback.** Bajo. Es un cambio de estilo centralizado. Rollback =
  redeploy anterior. Nota: la tipografía es una decisión de gusto; se puede
  cambiar la display por otra (p. ej. más ancha, tipo "Exa") sin tocar el resto.

---

## GK-013 · 1.0.56 — Anillo de calorías restantes (Nutrición)

- **Contexto.** El bloque "Today" mostraba consumido/meta con barra lineal y
  macros solo en gramos (sin comparar vs meta). El usuario pidió un anillo tipo
  "consumido vs restante" (con una foto de referencia de otra app).
- **Síntoma.** No había una vista de "cuánto me queda hoy" prominente ni macros
  vs meta.
- **Causa raíz.** Diseño lineal previo; el prop `goal` solo traía calorías y
  proteína.
- **Solución.** Nuevo `CalorieRing` (SVG, presentacional): arco volt sobre pista
  oscura, calorías restantes al centro, naranja + "kcal over" al pasarse. Se
  reemplazó el bloque lineal por el anillo + fila Goal/Consumed + barras de
  macros vs meta. El prop `goal` se amplió a `carbs_g`/`fats_g` y la página los
  pasa. Se quitó el import de `Progress` (ya no se usa).
- **Decisión de arquitectura.** Ver ADR-013. Se mantiene la identidad premium
  GymKynex (oscuro, sin mascota); la foto solo inspiró el concepto. Componente
  puro reutilizable; datos reales (comidas de hoy + `computeNutritionGoal`).
- **Archivos modificados.** `src/components/nutrition/calorie-ring.tsx` (nuevo),
  `src/components/nutrition/nutrition-client.tsx`, `src/app/(app)/nutrition/page.tsx`.
- **Seguridad.** Solo presentación de datos del propio usuario.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde; vista previa SVG
  renderizada para QA visual.
- **Riesgos y rollback.** Bajo. Rollback = redeploy anterior.

---

## GK-012 · 1.0.55 — Check-in proactivo por push

- **Contexto.** Ya existía todo el sistema push (tablas, prefs, `web-push`, cron
  horario seguro con CRON_SECRET, limpieza de subs muertas). Faltaba el check-in
  con datos reales (ADR-010 hablaba de "proteína X/7 días").
- **Síntoma.** El nudge de nutrición solo recordaba "registra tus comidas", sin
  resumen de adherencia.
- **Causa raíz.** No se computaba la adherencia semanal vs meta.
- **Solución.** En `/api/cron/reminders`, rama de check-in que corre los domingos
  (weekday local === 0) a la hora del usuario: trae perfil (meta) + comidas de 7
  días, agrupa por día, calcula promedio de kcal/proteína y días con meta de
  proteína alcanzada, y arma el mensaje. Reusa `computeNutritionGoal`.
- **Decisión de arquitectura.** Ver ADR-010. SIN migración: opt-out con la pref
  `nutrition`; se dispara una vez (único match de hora); prioridad sobre el nudge
  diario (nunca dos); si no hay comidas, cae al nudge normal.
- **Archivos modificados.** `src/app/api/cron/reminders/route.ts`,
  `.env.local.example`.
- **Seguridad.** Endpoint protegido por CRON_SECRET (Bearer de Vercel). Service
  role solo en el server. Datos por `user_id`.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde. El envío real
  requiere VAPID + CRON_SECRET y prueba en dispositivo suscrito.
- **Riesgos y rollback.** Bajo. Aislado en una rama del cron. Rollback = quitar la
  rama de check-in; el resto de recordatorios intacto.

---

## GK-011 · 1.0.54 — Resiliencia offline (PWA)

- **Contexto.** El SW existente evitaba a propósito cachear navegaciones/API
  (cache-first de navegaciones causaba "page couldn't load", por redirects).
- **Síntoma.** Sin conexión no se podía ver el plan; con el SW conservador,
  ninguna página cargaba offline.
- **Causa raíz.** No había caché del plan ni página de respaldo offline.
- **Solución.** (1) Caché del plan en localStorage (`offline-plan.ts` +
  `<CachePlan>` en Tren, side-effect puro). (2) Página pública `/offline`
  (estática) que lee el plan y lo muestra read-only. (3) SW: fallback de
  navegación NETWORK-FIRST — `fetch(request).catch(() => caches.match('/offline'))`.
  Nunca cachea navegaciones (no reintroduce el bug); solo sirve `/offline` en
  fallo de red. Cache v3->v4; precache de `/offline` en install.
- **Decisión de arquitectura.** Ver ADR-011. Network-first (no cache-first) para
  navegaciones = online siempre fresco. Solo se maneja GET (POST/forms pasan
  directo). El plan cacheado es read-only; nunca reemplaza datos vivos.
- **Archivos modificados.** `src/lib/offline-plan.ts`,
  `src/components/workouts/cache-plan.tsx`, `src/app/offline/page.tsx`,
  `public/sw.js`, `src/app/(app)/workouts/page.tsx`.
- **Seguridad.** `/offline` no tiene datos de sesión (solo lee localStorage del
  propio dispositivo). El SW no toca API/auth.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde; `/offline`
  prerenderizada estática. NO probado el comportamiento offline en navegador
  (requiere dispositivo/modo avión) — riesgo residual acotado por el diseño
  network-first y el rollback simple.
- **Riesgos y rollback.** Riesgo: el fallback de navegación del SW no se validó en
  runtime; mitigado con network-first (online intacto) y cache bump. El plan solo
  se ve completo si los assets de `/offline` ya se cachearon (tras cargarla online
  una vez). Rollback = revertir `public/sw.js`.

---

## GK-010 · 1.0.53 — Editar la memoria del coach

- **Contexto.** Ya existía `CoachMemorySettings` (ver/borrar/pausar) + la API
  GET/PATCH/DELETE. Faltaba editar el texto de una memoria (pedido en ADR-009).
- **Síntoma.** No se podía corregir el contenido de una memoria, solo borrarla.
- **Causa raíz.** No había endpoint ni UI de edición.
- **Solución.** Nuevo `PUT` en `/api/coach/memory` (valida `id` uuid + `content`
  1..500, scoped por user_id + RLS). `GET` amplía a `kind`. UI: edición inline
  (input + guardar/cancelar, optimista con revert si falla), confirmación de dos
  toques en "borrar todo", y etiqueta de tipo por memoria.
- **Decisión de arquitectura.** Ver ADR-009. Se completa el componente existente
  en vez de crear una pantalla nueva (menos superficie, misma ubicación en Perfil).
- **Archivos modificados.** `src/app/api/coach/memory/route.ts`,
  `src/components/profile/coach-memory-settings.tsx`.
- **Seguridad.** Toda operación filtra por `user_id` y la RLS lo refuerza en la
  base; el contenido se valida (longitud) en el servidor.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde.
- **Riesgos y rollback.** Bajo. Edición optimista con revert ante error. Rollback
  = redeploy anterior.

---

## GK-009 · 1.0.52 — El coach ve los datos de Calorie intake

- **Contexto.** El contexto del coach ya incluía un resumen de comidas (3 días +
  promedio 7 días) pero sin comparar contra la meta diaria.
- **Síntoma.** El coach no podía hablar de déficit/superávit con números.
- **Causa raíz.** No se inyectaba la meta ni la comparación.
- **Solución.** En `loadContext`, se amplió el select del perfil con `age` y los
  `custom_*`, se computa la meta con `computeNutritionGoal` y se anexa una línea
  de comparación (déficit/superávit/on target + proteína vs meta) a `todayNutrition`.
- **Decisión de arquitectura.** Ver ADR-008. Se reusa `computeNutritionGoal` (una
  sola fuente de verdad de la meta) y el bloque `todayNutrition` existente, sin
  tocar `persona.ts`. Comparación tz-robusta (promedios, no fronteras de día).
- **Archivos modificados.** `src/app/api/coach/route.ts`.
- **Seguridad.** Solo datos del propio usuario (consulta por `user_id`, RLS).
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde; lógica verificada
  (2067 vs 2780 → "deficit of 713 kcal/day").
- **Riesgos y rollback.** Bajo. Si falta perfil, la meta cae a un default marcado
  como tal. Rollback = redeploy anterior.

---

## GK-008 · 1.0.51 — Auto-hospedar imágenes de ejercicios

- **Contexto.** `exercises.image_url`/`images[]` apuntaban por hotlink a
  `cdn.jsdelivr.net/gh/yuhonas/free-exercise-db` (dominio público).
- **Síntoma.** Dependencia de un CDN de terceros: si jsDelivr o el repo cambian,
  las imágenes fallan (degradan a gradiente, pero es una dependencia externa).
- **Causa raíz.** Las imágenes nunca se auto-hospedaron.
- **Solución.** 668 imágenes (334 ejercicios) extraídas del repo en GitHub
  (checkout disperso). Bucket público `exercise-media`; script de subida
  (`scripts/subir_exercise_media.mjs`, service key por entorno). Reescritura por
  PREFIJO en SQL de `image_url` e `images[]` (unnest/array_agg), solo en filas de
  jsDelivr.
- **Decisión de arquitectura.** Ver ADR-007. Reescritura por prefijo (no mapeo
  por fila) → simple e idempotente. Reversible vía backup/restore. Sin cambios de
  código: `ExerciseImage` ya consume `image_url` y degrada con `onError`.
- **Archivos modificados.** `supabase/backup_exercise_images.sql`,
  `restore_exercise_images.sql`, `exercise_media_bucket.sql`,
  `importar_imagenes_autohospedadas.sql`, `scripts/subir_exercise_media.mjs`.
- **Seguridad.** Bucket público solo-lectura; contenido de dominio público. El
  service key va por entorno, nunca al repo.
- **Pruebas realizadas.** Extracción verificada (668/668 imágenes, 0 faltantes);
  script `node --check` OK; `tsc` limpio (sin cambios de código de app).
- **Riesgos y rollback.** Bajo. Riesgo: imágenes faltantes → gradiente (no crash).
  Orden importa (subir antes de reescribir). Rollback = `restore_exercise_images.sql`.

---

## GK-007 · 1.0.50 — Seguridad: auditoría RLS + rastreo de errores (Sentry)

- **Contexto.** Las tablas nuevas podían quedar fuera del `verificar_seguridad.sql`
  (lista fija), y los crashes solo se detectaban por captura de pantalla.
- **Síntoma.** Sin visibilidad proactiva de fallos ni verificación dinámica de RLS.
- **Causa raíz.** Falta de (a) auditoría que descubra el estado real y (b)
  telemetría de errores.
- **Solución.**
  - `supabase/auditoria_seguridad.sql`: SELECTs sobre `pg_class`/`pg_policy`/
    `storage.buckets` que reportan tablas sin RLS, tablas con RLS sin políticas,
    inventario de RLS, buckets públicos y políticas de Storage. Solo lectura.
  - `@sentry/nextjs` con init **solo en runtime** (`instrumentation.ts` para
    server/edge, `instrumentation-client.ts` para browser). Sin `withSentryConfig`
    (evita el plugin de build bajo Turbopack). `error.tsx` y `global-error.tsx`
    llaman `Sentry.captureException`.
- **Decisión de arquitectura.** Ver ADR-006 (Sentry) y ADR-012 (auditoría RLS).
  Integración gated por DSN: `enabled: !!dsn`; sin DSN el SDK es no-op (cero red,
  cero overhead), así que la ausencia de credenciales no puede romper nada.
  `sendDefaultPii: false`; source maps se pueden añadir después con un auth token.
- **Archivos modificados.** `instrumentation.ts`, `instrumentation-client.ts`,
  `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/app/error.tsx`,
  `src/app/global-error.tsx`, `.env.local.example`, `package.json`,
  `supabase/auditoria_seguridad.sql` (nuevo).
- **Seguridad.** El script de auditoría no modifica datos. Sentry no envía PII por
  defecto; el DSN va como variable de entorno (no en el repo). La consola sigue
  logueando solo el `digest` opaco.
- **Pruebas realizadas.** `tsc` limpio; `next build` (Next 16 + Turbopack) en
  verde con Sentry instalado; verificado que sin DSN el SDK queda deshabilitado
  (no-op) y el build no falla.
- **Riesgos y rollback.** Bajo. Riesgo principal era romper el build de Turbopack;
  mitigado usando init runtime sin plugin. Rollback: quitar variables (desactiva)
  o redeploy anterior.

---

## GK-006 · 1.0.49 — Sistema de documentación

- **Contexto.** La documentación crecía sin formato consistente; `VERSIONES.md`
  tenía 46 etiquetas "(actual)" heredadas y no había registro de decisiones.
- **Síntoma.** Difícil auditar qué cambió, por qué y con qué riesgo.
- **Causa raíz.** Falta de convención de metadatos y de separación público/interno.
- **Solución.** Normalización de los 4 documentos + `DECISIONS.md`; leyenda de
  metadatos e índice de versiones; SemVer en CHANGELOG; secciones fijas en
  RELEASE_NOTES; esta estructura en ENGINEERING_LOG.
- **Decisión de arquitectura.** Ver `DECISIONS.md` ADR-005. Docs públicos:
  CHANGELOG, RELEASE_NOTES. Internos: ENGINEERING_LOG, VERSIONES, DECISIONS.
- **Archivos modificados.** `CHANGELOG.md`, `RELEASE_NOTES.md`,
  `ENGINEERING_LOG.md`, `VERSIONES.md`, `DECISIONS.md` (nuevo), `src/lib/version.ts`.
- **Seguridad.** Se revisó que ningún documento exponga secretos, tokens ni
  variables privadas. Sin cambios de superficie de ataque.
- **Pruebas realizadas.** Solo cambios en `.md` + constante de versión; `tsc`
  limpio; sin cambios de comportamiento de la app.
- **Riesgos y rollback.** Riesgo nulo para la app. Rollback = restaurar los `.md`.

---

## GK-005 · 1.0.48 — Revert de animaciones de ejercicios

- **Contexto.** GK-003/GK-004 introdujeron animaciones de ejercicios con frames
  de Everkinetic (WebP en bucle), emparejados por conjuntos de tokens. Nunca se
  aplicó a producción.
- **Síntoma.** Calidad visual insuficiente (dibujos a dos frames), por debajo del
  estándar del producto.
- **Causa raíz.** La fuente gratuita con licencia clara (Everkinetic, CC BY-SA
  4.0) no tiene calidad suficiente; las de calidad (Gym Visual) son de pago.
- **Solución.** Retiro completo de la función.
- **Decisión de arquitectura.** Ver `DECISIONS.md` ADR-003. Principio: solo
  integrar medios de buena calidad **y** licencia clara.
- **Archivos modificados.** Eliminados `src/app/credits/page.tsx`, enlaces en
  `src/app/page.tsx` y `src/components/profile/settings-form.tsx`, los SQL
  `exercise_media_bucket` / `import_exercise_animations` / `backup_exercise_images`
  / `restore_exercise_images`, y `ATTRIBUTION.md`.
- **Seguridad.** Sin impacto. No se creó bucket público en producción.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde; verificado que no
  queda referencia colgante a `/credits`.
- **Riesgos y rollback.** Riesgo bajo. `ExerciseImage` degrada a gradiente vía
  `onError`. Rollback = redeploy anterior. Sin migración que revertir.

---

## GK-002 · 1.0.45 — Crash al guardar + tooltip en negro

### Bug 1: pantalla "Algo salió mal" al guardar
- **Contexto.** Formulario de Configuración con Server Actions.
- **Síntoma.** "Guardar cambios" (y cambiar contraseña / borrar cuenta) llevaba
  al error boundary global.
- **Causa raíz.** En `settings-form.tsx`, los handlers hacían `await` de una
  Server Action **sin try/catch** dentro de `startTransition`. Si la promesa se
  **rechazaba** (red, timeout, Firewall de Vercel), la excepción no capturada
  burbujeaba al error boundary y borraba la pantalla, aunque el guardado no fuera
  el problema.
- **Solución.** `save()`, `onChangePassword()`, `onDeleteAccount()` envuelven el
  `await` en try/catch con `toast.error`; `finally` restablece el estado de
  carga. Defensa extra: `profile/settings/page.tsx` tolera que `getProfile()`
  (fail-closed) lance en el re-render posterior, cayendo a `mockProfile` sin que
  el usuario note diferencia (el formulario conserva su estado en el cliente).
- **Decisión de arquitectura.** Ver `DECISIONS.md` ADR-002: toda llamada a Server
  Action desde el cliente debe capturar el rechazo; una mutación exitosa jamás
  debe poder crashear por su propio re-render de revalidación.
- **Archivos modificados.** `src/components/profile/settings-form.tsx`,
  `src/app/(app)/profile/settings/page.tsx`.
- **Seguridad.** Sospechoso: Attack Challenge Mode en Vercel Firewall (pendiente
  de desactivar). No se registran datos sensibles en los toasts.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde; confirmado que los
  tres handlers capturan el rechazo.
- **Riesgos y rollback.** Bajo. Rollback = redeploy anterior.

### Bug 2: tooltip en negro sobre fondo oscuro
- **Síntoma.** Al tocar una barra en Calorie intake, el texto salía en negro.
- **Causa raíz.** El `Tooltip` de recharts no fijaba el color del texto del ítem;
  con `<Cell>` por barra, recharts caía a un color por defecto oscuro.
- **Solución.** `itemStyle={{ color: "var(--foreground)" }}`.
- **Archivos modificados.** `src/components/nutrition/net-energy-client.tsx`.
- **Pruebas realizadas.** `next build` en verde; QA visual del tooltip.

---

## GK-001 · 1.0.44 — Calorie intake (reemplaza Net Energy) + chat

### Net Energy → Calorie intake
- **Contexto.** El "quemado" era una estimación (BMR Mifflin-St Jeor × 1.2 +
  quema activa por MET).
- **Síntoma.** Sin wearable, el dato confundía y era poco fiable.
- **Causa raíz.** Estimar quema sin sensor no es defendible como métrica.
- **Solución.** Se eliminó "quemado". `energy.ts` reescrito como ingesta pura
  (`buildIntakeSeries`, `rollingAvg`, `rollingTotal`). `getEnergyRaw` →
  `getIntakeRaw` (comidas + meta vía `computeNutritionGoal`, la misma de la
  pestaña de Nutrición). Agrupación por día LOCAL en el cliente (evita días
  fantasma UTC). UI con `ReferenceLine` de meta; verde ≤ meta, naranja > meta.
- **Decisión de arquitectura.** Ver `DECISIONS.md` ADR-001.
- **Archivos modificados.** `src/lib/energy.ts`, `src/lib/data.ts`,
  `src/components/nutrition/net-energy-client.tsx`,
  `src/app/(app)/nutrition/energy/page.tsx`, `src/app/(app)/nutrition/page.tsx`.
- **Seguridad.** Consultas con RLS por `user_id`. Sin datos de otros usuarios.
- **Pruebas realizadas.** `tsc` limpio; `next build` en verde; verificación
  numérica de magnitudes.
- **Riesgos y rollback.** Bajo. Rollback = redeploy anterior.

### Chat del coach
- **Foto persistente.** Nueva columna `image_path` en `coach_messages`
  (`coach_imagen_en_chat.sql`). Al recargar se firma URL 1h. Robusto ante orden
  de deploy: si la columna no existe, el texto se guarda igual y el historial no
  desaparece.
- **Scroll.** Salto instantáneo al último mensaje al montar (con reintentos por
  imágenes), scroll suave después, y flecha flotante para bajar.
- **Barra inferior.** `BottomNav` escucha `focusin`/`focusout` de elementos
  editables y se oculta mientras el teclado está abierto.
- **Archivos modificados.** `src/app/api/coach/route.ts`, `src/lib/data.ts`,
  `src/components/coach/coach-chat.tsx`, `src/components/layout/bottom-nav.tsx`,
  `supabase/coach_imagen_en_chat.sql`.
- **Seguridad.** La URL firmada pasa por el cliente del usuario; la RLS de Storage
  garantiza que solo ve su propia foto.

---

_Versiones anteriores a 1.0.44 (1.0.0–1.0.43) están resumidas en `VERSIONES.md`.
No se reconstruye su detalle técnico para no inventar información que no existe._
