# Decisiones (ADR) — GymTrack Pro

> **Documento INTERNO.** Registro de decisiones de producto y arquitectura
> (Architecture Decision Records). No exponer secretos ni variables privadas.

Cada ADR: **ID · Fecha · Estado · Contexto · Decisión · Alternativas
consideradas · Consecuencias · Estrategia de reversión.**
Estados: **Propuesta · Aceptada · Reemplazada · Retirada.**

---

## ADR-001 · 2026-07-14 · Aceptada — Calorie intake en lugar de "quemado" estimado
- **Contexto.** La pantalla "Net Energy" mostraba calorías quemadas estimadas
  (BMR + MET), confusas sin un wearable.
- **Decisión.** Eliminar el "quemado" y centrar la pantalla en calorías
  consumidas vs meta diaria (datos 100% reales de comidas logueadas).
- **Alternativas.** (a) Mantener la estimación con más avisos. (b) Integrar un
  wearable (fuera de alcance sin hardware ni API disponible).
- **Consecuencias.** Números fiables y coherentes con Nutrición; se pierde la
  noción de déficit/superávit calculada.
- **Reversión.** Reintroducir `energy.ts` previo y la vista Net Energy.

## ADR-002 · 2026-07-14 · Aceptada — Capturar rechazos de Server Actions en el cliente
- **Contexto.** Un `await` de Server Action sin try/catch en `startTransition`
  tumbaba la app ante fallos de red.
- **Decisión.** Toda llamada a Server Action desde el cliente captura el rechazo
  y muestra un aviso; una mutación exitosa nunca debe crashear por su re-render.
- **Alternativas.** Confiar en que la acción "no lance" (insuficiente ante fallos
  de transporte).
- **Consecuencias.** UX resiliente; patrón a replicar en toda la app.
- **Reversión.** No aplica (es un principio; revertir bajaría la robustez).

## ADR-003 · 2026-07-14 · Aceptada — No usar animaciones de ejercicios de Everkinetic
- **Contexto.** Se evaluó animar ejercicios con Everkinetic (CC BY-SA 4.0).
- **Decisión.** No adoptarlas por calidad visual insuficiente.
- **Alternativas.** Gym Visual (mejor calidad, pero de pago y sin licencia
  libre); auto-generar animaciones (fuera de alcance).
- **Consecuencias.** Se mantienen las fotos actuales (dominio público). Sin
  obligación de ShareAlike.
- **Reversión.** Reintroducir el pipeline documentado en el historial.

## ADR-004 · 2026-07-14 · Aceptada (pendiente de implementación) — Rebrand a GymKynex
- **Contexto.** Cambio de nombre de "GymTrack Pro" a "GymKynex" con nuevo logo
  (monograma FK) y misma paleta (verde #30D158 / negro #0A0B0D).
- **Decisión.** Adoptar la marca GymKynex; ejecutar el rebrand en código cuando
  el dominio esté asegurado. Se entregó el logo en SVG (isotipo + imagotipo).
- **Alternativas.** Mantener GymTrack Pro (nombre genérico, ya en uso).
- **Consecuencias.** Nuevo dominio, redirecciones/SEO, actualizar todas las
  referencias de marca. La paleta se mantiene, así que la UI casi no cambia.
  Pendiente: búsqueda de marca ("Kynex" existe en otras clases) y compra de
  dominio.
- **Reversión.** Revertir referencias de marca a GymTrack Pro.

## ADR-005 · 2026-07-14 · Aceptada — Sistema de documentación y ADRs
- **Contexto.** Documentación sin formato consistente ni registro de decisiones.
- **Decisión.** Estandarizar CHANGELOG/RELEASE_NOTES/ENGINEERING_LOG/VERSIONES,
  crear DECISIONS.md, metadatos por versión (GK-xxx) y separación público/interno.
- **Alternativas.** Seguir con documentación ad-hoc.
- **Consecuencias.** Trazabilidad y auditoría más fáciles; disciplina por versión.
- **Reversión.** Volver a los `.md` previos.

---

## ADR-013 · 2026-07-17 · Aceptada (implementada en 1.0.56) — Mantener identidad premium + anillo de calorías
- **Contexto.** El usuario evaluó cambiar todo el UX a un estilo claro/juguetón
  (con mascota, ref. de otra app) y pidió un anillo de calorías restantes.
- **Decisión.** MANTENER la identidad premium GymKynex (oscuro, verde volt, sin
  mascota) y agregar el anillo en ese estilo. La foto solo sirvió de referencia
  del concepto.
- **Alternativas.** Pivotar a estilo claro-amigable (rechazado: choca con la
  marca GymKynex ya definida; un medio-pivote se ve peor que cualquier extremo).
- **Consecuencias.** Coherencia de marca; el UX se puede volver más distintivo
  sin cambiar de carril.
- **Reversión.** Revertir el bloque del anillo a la barra lineal previa.

## ADR-014 · 2026-07-17 · Aceptada (implementada en 1.0.57) — Tipografía propia + firma de movimiento
- **Contexto.** La app se leía genérica por usar solo fuentes del sistema; el
  usuario quiere una identidad más distintiva sin cambiar de carril (premium-oscuro).
- **Decisión.** Introducir Space Grotesk (display) + JetBrains Mono (datos),
  auto-hospedadas, y una firma de movimiento tipo "instrumento" (anillo que dibuja
  + números que cuentan), respetando reduce-motion. Mantener oscuro+volt y el
  system font para el cuerpo.
- **Alternativas.** Cambiar toda la paleta/estilo (rechazado: la marca fija
  oscuro+volt); pagar la fuente "Exa" del brand sheet (no libre); Space Grotesk vía
  Google en runtime (rechazado: dependencia externa, privacidad).
- **Consecuencias.** Identidad más propia y premium; ~320KB de fuentes en el bundle.
  La display es una decisión de gusto, intercambiable.
- **Reversión.** Revertir los tokens de fuente a los stacks del sistema.

## ADR-015 · 2026-07-17 · Aceptada (implementada en 1.0.60) — Contraste mínimo WCAG AA
- **Contexto.** El texto secundario tenue (`--muted-2`) no cumplía el contraste AA.
- **Decisión.** Subir `--muted-2` en ambos temas al mínimo que pasa 4.5:1 en
  tarjetas, aun a costa de aplanar un poco la jerarquía de grises.
- **Alternativas.** Mantenerlo tenue y auditar caso por caso para usarlo solo en
  texto grande/decorativo (más trabajo y frágil); ignorar AA (rechazado).
- **Consecuencias.** Texto secundario legible; menos separación entre muted y
  muted-2. Base para futuros pases de a11y (foco de teclado, aria, etc.).
- **Reversión.** Revertir los dos valores de token.

# Hoja de ruta — decisiones propuestas (a implementar una por versión)

> Estado **Propuesta**: acordadas conceptualmente, aún sin implementar. Cada una
> se implementará y probará por separado, con su propia versión y metadatos.

## ADR-006 · 2026-07-14 · Aceptada (implementada en 1.0.50) — Rastreo de errores (Sentry)
- **Contexto.** Hoy los crashes se detectan por captura de pantalla del usuario.
- **Decisión.** Integrar `@sentry/nextjs` **solo en runtime** (init en
  `instrumentation.ts` / `instrumentation-client.ts`, sin `withSentryConfig` para
  no arriesgar el build de Turbopack). Gated por DSN; sin
  `NEXT_PUBLIC_SENTRY_DSN` queda no-op. `sendDefaultPii: false`.
- **Alternativas.** Logging propio (menos completo); usar el plugin de build de
  Sentry (riesgo con Turbopack en Next 16); no hacer nada.
- **Consecuencias.** Detección proactiva con stack traces; requiere cuenta y DSN
  en Vercel. Sin source maps por ahora (se pueden añadir con un auth token).
- **Reversión.** Quitar las variables (desactiva) o revertir los archivos de init.

## ADR-007 · 2026-07-14 · Aceptada (implementada en 1.0.51) — Auto-hospedar imágenes de ejercicios
- **Contexto.** Las fotos se servían por hotlink desde jsDelivr (free-exercise-db,
  dominio público).
- **Decisión.** Servirlas desde Supabase Storage (bucket público `exercise-media`).
  Reescritura por prefijo en SQL; subida con script; reversible con backup/restore.
- **Alternativas.** Seguir con jsDelivr; mapeo por fila (más frágil).
- **Consecuencias.** Más control y fiabilidad; consume storage/egress de Supabase.
- **Reversión.** `restore_exercise_images.sql` (hay backup de image_url + images).

## ADR-008 · 2026-07-14 · Aceptada (implementada en 1.0.52) — Conectar el coach con los datos de Calorie intake
- **Contexto.** El coach tenía resumen de comidas pero no la comparación con la meta.
- **Decisión.** Inyectar en el contexto la comparación ingesta vs meta
  (déficit/superávit/on target + proteína), reusando `computeNutritionGoal`.
- **Alternativas.** Mantener el coach sin esos datos; recomputar la meta aparte
  (se descartó: una sola fuente de verdad).
- **Consecuencias.** Respuestas más útiles; unos pocos tokens más de contexto.
- **Reversión.** Quitar la línea de comparación de `todayNutrition`.

## ADR-009 · 2026-07-14 · Aceptada (implementada en 1.0.53) — Pantalla "lo que tu coach recuerda"
- **Contexto.** La memoria del coach era opt-in y ya se veía/borraba/pausaba en
  Perfil, pero no se podía editar.
- **Decisión.** Completar el componente existente con edición inline, endpoint
  `PUT`, confirmación al borrar todo y etiqueta de tipo. No se crea pantalla nueva.
- **Alternativas.** Pantalla dedicada aparte (más superficie, redundante).
- **Consecuencias.** Más confianza y control; edición protegida por user_id + RLS.
- **Reversión.** Quitar el endpoint PUT y el modo edición de la UI.

## ADR-010 · 2026-07-14 · Aceptada (implementada en 1.0.55) — Check-ins proactivos por push
- **Contexto.** El sistema push (cron horario + prefs) ya existía, sin check-in
  de adherencia con datos reales.
- **Decisión.** Añadir un check-in semanal (domingos) al cron con el resumen de
  nutrición vs meta, reusando `computeNutritionGoal`. Opt-out con la pref
  `nutrition`; sin migración; una vez por semana; prioridad sobre el nudge diario.
- **Alternativas.** Columna dedicada + tracking de "último enviado" (innecesario:
  la hora del cron ya limita a un disparo); nudge diario de adherencia (spam).
- **Consecuencias.** Empujón semanal concreto; requiere VAPID + CRON_SECRET.
- **Reversión.** Quitar la rama de check-in del cron.

## ADR-011 · 2026-07-14 · Aceptada (implementada en 1.0.54) — Resiliencia offline (PWA)
- **Contexto.** Un gimnasio con mala señal puede dejar sin plan. El SW existente
  evitaba cachear navegaciones (cache-first rompía por redirects).
- **Decisión.** Caché del plan en localStorage + página `/offline` read-only +
  fallback de navegación NETWORK-FIRST en el SW (no cache-first): online siempre
  fresco, `/offline` solo cuando no hay red.
- **Alternativas.** Cache-first de navegaciones (rechazado: reintroduce el bug);
  requerir conexión siempre; librería PWA (más peso/riesgo).
- **Consecuencias.** Plan visible sin señal; registrar series aún requiere red.
  El fallback del SW necesita prueba en dispositivo.
- **Reversión.** Revertir `public/sw.js` (auto-actualiza) y quitar `/offline`.

## ADR-012 · 2026-07-14 · Aceptada (implementada en 1.0.50) — Auditoría de seguridad / RLS
- **Contexto.** Tablas nuevas (p. ej. `coach_messages.image_path`) requieren
  verificación de RLS; `verificar_seguridad.sql` usa una lista fija.
- **Decisión.** Añadir `auditoria_seguridad.sql`, auditoría de SOLO LECTURA que
  descubre dinámicamente tablas sin RLS, tablas sin políticas y buckets públicos.
  Cadencia sugerida: correrla al agregar tablas/buckets y antes de cada release.
- **Alternativas.** Revisar solo ad-hoc; confiar solo en la lista fija.
- **Consecuencias.** Menor riesgo de fuga; esfuerzo recurrente (correr el script).
- **Reversión.** No aplica (es una práctica + un script de solo lectura).
