# Control de versiones — GymTrack Pro

La versión se muestra en Perfil y en Settings. Para confirmar qué build está en
vivo, mira ese número. Se cambia en un solo lugar: `src/lib/version.ts`.


## Pendientes / implementacion futura

- **Fotos de progreso** y **Import de Apple Health**: el codigo y las tablas
  (progress_photos.sql, schema_storage_opcional.sql, health_data.sql) estan
  listos y ejecutados, pero los datos no cargan. Causa mas probable: el
  certificado SSL invalido + Attack Challenge Mode en Vercel cortan las subidas.
  ACCION al retomar: primero arreglar cert + desactivar Attack Challenge Mode en
  Vercel, luego reprobar. Es muy posible que funcione sin tocar codigo.
- **Spotify**: integrar API oficial (OAuth) para playlists. Requiere Premium
  para reproducir. Nice-to-have.
- **Stripe / pagos Pro**: cuando haya muchos usuarios.
- **App nativa iOS**: para leer Apple Watch en tiempo real (FC, distancia en vivo).


## Sistema de documentacion (interno)

Este archivo es el **historial completo en español** (documento INTERNO). Se
complementa con, sin duplicar:
- `CHANGELOG.md` (publico) — resumen breve por version, orientado a producto.
- `RELEASE_NOTES.md` (publico) — funcional para equipo/QA/usuarios internos.
- `ENGINEERING_LOG.md` (interno) — detalle tecnico por version.
- `DECISIONS.md` (interno) — decisiones de producto/arquitectura (ADRs).

**Metadatos por version** (cuando aplican): ID interno `GK-xxx`, fecha, autor,
tipo (Feature/Fix/Security/Performance/UX/Database/Infrastructure), impacto
(Bajo/Medio/Alto/Critico), breaking change (Si/No), requiere SQL (Si/No),
requiere config en Vercel/Supabase (Si/No). Los IDs `GK-xxx` se introdujeron en
GK-006 y se asignaron retroactivamente desde 1.0.44; las versiones anteriores
conservan su resumen historico sin ID.

### Indice de versiones recientes

| ID | Version | Fecha | Tipo | Impacto | Breaking | SQL | Config |
|----|---------|-------|------|---------|----------|-----|--------|
| GK-017 | 1.0.60 | 2026-07-17 | UX | Bajo | No | No | No |
| GK-016 | 1.0.59 | 2026-07-17 | UX | Bajo | No | No | No |
| GK-015 | 1.0.58 | 2026-07-17 | UX | Bajo | No | No | No |
| GK-014 | 1.0.57 | 2026-07-17 | UX | Medio | No | No | No |
| GK-013 | 1.0.56 | 2026-07-17 | UX | Bajo | No | No | No |
| GK-012 | 1.0.55 | 2026-07-14 | Feature | Medio | No | No | Si* |
| GK-011 | 1.0.54 | 2026-07-14 | Feature | Medio | No | No | No |
| GK-010 | 1.0.53 | 2026-07-14 | UX | Bajo | No | No | No |
| GK-009 | 1.0.52 | 2026-07-14 | Feature | Bajo | No | No | No |
| GK-008 | 1.0.51 | 2026-07-14 | Infrastructure | Medio | No | No** | Si*** |
| GK-007 | 1.0.50 | 2026-07-14 | Security | Medio | No | No | Si* |
| GK-006 | 1.0.49 | 2026-07-14 | Infrastructure | Bajo | No | No | No |
| GK-005 | 1.0.48 | 2026-07-14 | Feature (revert) | Bajo | No | No | No |
| GK-004 | 1.0.47 | 2026-07-14 | Feature | Bajo | No | No* | No |
| GK-003 | 1.0.46 | 2026-07-14 | Feature | Bajo | No | No* | No |
| GK-002 | 1.0.45 | 2026-07-14 | Fix | Alto | No | No | Si** |
| GK-001 | 1.0.44 | 2026-07-14 | Feature | Medio | No | Si*** | No |

\* 1.0.46/1.0.47 traian SQL opcional (bucket/import) que se retiro en 1.0.48; nunca se ejecuto.
\** 1.0.45: no requiere config, pero se recomienda desactivar Attack Challenge Mode en Vercel (mitiga la causa del crash).
\*** 1.0.44: la foto del coach requiere `coach_imagen_en_chat.sql`.
\*(GK-012) 1.0.55: los check-ins requieren VAPID + CRON_SECRET en Vercel (el sistema push ya existía; sin esas variables no se envía nada).
\*(GK-007) 1.0.50: Sentry es OPCIONAL; requiere `NEXT_PUBLIC_SENTRY_DSN` en Vercel para activarse. Sin DSN queda deshabilitado.
\**(GK-008) 1.0.51: el SQL de reescritura no es una migración de esquema; es un cambio de datos reversible (backup/restore).
\***(GK-008) 1.0.51: requiere crear el bucket y subir imágenes; no toca variables de entorno de la app.

Autor de las versiones recientes: Keivis Cabrera (con asistencia de Claude).

## Historial

- **1.0.60** (actual) — Retoque de accesibilidad: contraste (WCAG AA).
  `[GK-017 · 2026-07-17 · UX · Impacto Bajo · Breaking No · SQL No · Config No]`
  - Auditoría de contraste medida (no a ojo): `foreground`, `muted`, `volt` y
    `coral` ya cumplían AA (>=4.5:1) en todos los fondos. El único que fallaba era
    `--muted-2` (2.5-3.3, texto secundario tipo "/180g" o fechas).
  - Se subió `--muted-2` en ambos temas al mínimo que pasa AA en tarjetas
    manteniéndolo como secundario: oscuro `#5f646b`->`#8b9099` (s2=5.26, s3=4.71),
    claro `#9298a1`->`#6b7079`. Cambio centralizado en tokens.
  - Tamaños de toque verificados: los botones de ícono son 28-32px (>=24px, WCAG
    2.2 AA). No se tocó el layout.
  - Archivo: `src/app/globals.css`. Ver ADR-015.

- **1.0.59**  — Firma consistente en Progreso.
  `[GK-016 · 2026-07-17 · UX · Impacto Bajo · Breaking No · SQL No · Config No]`
  - Se extendió el "encendido" a la tarjeta "Your week" de Progreso: sus 3 stats
    (workouts, kg, racha) hacen count-up, y lleva la misma hairline volt que la
    tarjeta principal del Home (firma consistente entre tarjetas resumen).
  - El estado vacío de Progreso ya estaba bien (invitación a actuar); no se tocó.
  - Con esto la firma de movimiento queda en las 3 pantallas de datos (Home,
    Nutrición, Progreso) y se detiene ahí a propósito ("menos es más").
  - Archivo: `src/components/progress/weekly-recap.tsx`. Continúa ADR-014.

- **1.0.58**  — El Home "enciende": count-up + detalle firma.
  `[GK-015 · 2026-07-17 · UX · Impacto Bajo · Breaking No · SQL No · Config No]`
  - Se extendió la firma de movimiento al Home: los stats clave (workouts, volumen,
    vs semana pasada) y la racha hacen COUNT-UP al cargar, como un panel que
    enciende. `CountUp` ahora acepta formato (volumen "Xk", delta "+Y%").
  - Detalle firma sutil: una hairline volt ("señal") en la tarjeta principal
    (plan de hoy), que marca la tarjeta activa. Un solo acento, sin recargar.
  - Respeta `prefers-reduced-motion`. Archivos: `src/components/ui/count-up.tsx`,
    `src/app/(app)/home/page.tsx`. Continúa ADR-014.

- **1.0.57**  — Identidad visual distintiva: tipografía + firma de movimiento.
  `[GK-014 · 2026-07-17 · UX · Impacto Medio · Breaking No · SQL No · Config No]`
  - Se reemplazaron las fuentes del SISTEMA (que hacían que la app se leyera
    genérica) por fuentes con carácter, manteniendo la marca premium-oscura:
    **Space Grotesk** (display/titulos, técnica y "kinética") y **JetBrains Mono**
    (números/datos, aire de instrumento). El cuerpo sigue en system font (nativo).
  - Auto-hospedadas (bajadas del repo de Google Fonts, sin depender de Google en
    runtime). Cambio centralizado en tokens: aplica a toda la app.
  - Firma de movimiento: el anillo de calorías se DIBUJA y el número hace COUNT-UP
    al cargar (como un instrumento encendiendo). Respeta `prefers-reduced-motion`.
  - Archivos: `src/app/fonts/*` (nuevas), `src/app/layout.tsx`, `src/app/globals.css`,
    `src/components/ui/count-up.tsx` (nuevo), `src/components/nutrition/calorie-ring.tsx`.
    Ver ADR-014.

- **1.0.56**  — Anillo de "calorías restantes hoy" en Nutrición.
  `[GK-013 · 2026-07-17 · UX · Impacto Bajo · Breaking No · SQL No · Config No]`
  - Se elevó el bloque "Today" de Nutrición: de barra lineal a un ANILLO circular
    (SVG) que muestra las calorías que faltan en el centro (o "kcal over" en
    naranja si te pasas), con Goal/Consumed y barras de macros vs meta (proteína
    volt, carbs azul, grasa ámbar). Todo dato real (comidas de hoy + meta).
  - En estilo premium GymKynex (oscuro, sin mascota). La foto de referencia solo
    inspiró el concepto del anillo.
  - Archivos: `src/components/nutrition/calorie-ring.tsx` (nuevo),
    `src/components/nutrition/nutrition-client.tsx`,
    `src/app/(app)/nutrition/page.tsx` (pasa meta completa). Ver ADR-013.

- **1.0.55**  — Check-in proactivo por push (resumen semanal de nutrición).
  `[GK-012 · 2026-07-14 · Feature · Impacto Medio · Breaking No · SQL No · Config Si]`
  - El cron de recordatorios (ya existente, horario y seguro con CRON_SECRET)
    ahora envía los DOMINGOS, a la hora local del usuario, un check-in con datos
    reales: días registrados, promedio de kcal y proteína, y cuántos días se
    alcanzó la meta de proteína. Enlaza a Calorie intake.
  - SIN migración SQL: usa la preferencia `nutrition` como opt-out y se dispara
    una sola vez (esa hora es el único match del día). Tiene prioridad sobre el
    nudge diario ese día (nunca manda dos). Si no hay comidas registradas, cae al
    nudge normal. Reusa `computeNutritionGoal`.
  - Archivos: `src/app/api/cron/reminders/route.ts`, `.env.local.example` (VAPID
    + CRON_SECRET documentados). Ver ADR-010 (Aceptada).
  - **Con esto, toda la hoja de ruta (ADR-006 a ADR-012) queda Aceptada.**

- **1.0.54**  — Resiliencia offline (PWA): tu plan visible sin señal.
  `[GK-011 · 2026-07-14 · Feature · Impacto Medio · Breaking No · SQL No · Config No]`
  - El plan activo se guarda en el dispositivo (localStorage) al abrir Tren con
    conexión. Nueva página pública `/offline` que lo muestra read-only con banner
    de "Offline" y botón de reintentar.
  - Service worker: fallback de navegacion NETWORK-FIRST (online SIEMPRE trae
    fresco; solo sin red sirve `/offline`). NUNCA cachea navegaciones, así que no
    reintroduce el bug de "page couldn't load" que ya estaba resuelto. Cache v3->v4.
  - Archivos: `src/lib/offline-plan.ts`, `src/components/workouts/cache-plan.tsx`,
    `src/app/offline/page.tsx`, `public/sw.js`, hook en la página de Tren.
  - Ver ADR-011 (Aceptada).
  - NOTA: el fallback del SW necesita prueba en modo avión en dispositivo real
    (no se puede validar en build). El plan cacheado se ve del todo una vez que
    los assets de `/offline` se cachearon (tras cargarla online una vez).

- **1.0.53**  — Editar la memoria del coach ("lo que tu coach recuerda").
  `[GK-010 · 2026-07-14 · UX · Impacto Bajo · Breaking No · SQL No · Config No]`
  - La pantalla de memoria del coach (en Perfil) ya permitía ver, borrar (uno o
    todos) y pausar. Se COMPLETA con: **editar** el texto de cada memoria (inline),
    **confirmación de dos toques** al "borrar todo", y **etiqueta de tipo**
    (injury/preference/pr/goal).
  - API: nuevo `PUT` en `/api/coach/memory` (editar contenido, validado y scoped
    por user_id + RLS); el `GET` ahora incluye `kind`.
  - Archivos: `src/app/api/coach/memory/route.ts`,
    `src/components/profile/coach-memory-settings.tsx`. Ver ADR-009.

- **1.0.52**  — El coach ve tus datos de Calorie intake.
  `[GK-009 · 2026-07-14 · Feature · Impacto Bajo · Breaking No · SQL No · Config No]`
  - El contexto del coach ahora incluye la comparación de tu ingesta contra tu
    META diaria (déficit/superávit/on target) y proteína vs meta, además del
    resumen que ya tenía (3 días + promedio 7 días). Usa `computeNutritionGoal`,
    la misma meta de la pestaña de Nutrición.
  - Cambio aislado en `src/app/api/coach/route.ts` (más campos en el select del
    perfil + comparación con la meta). Sin migración ni config. Ver ADR-008.

- **1.0.51**  — Auto-hospedar imágenes de ejercicios (quita jsDelivr).
  `[GK-008 · 2026-07-14 · Infrastructure · Impacto Medio · Breaking No · SQL No(esquema) · Config Si(bucket+subida)]`
  - Las fotos de ejercicios (dominio público, free-exercise-db) dejan de servirse
    por hotlink desde jsDelivr y pasan a tu Storage de Supabase (bucket público
    `exercise-media`). Quita una dependencia externa; misma licencia.
  - 668 imágenes (334 ejercicios) extraídas del repo de GitHub y empaquetadas.
  - Reescritura por PREFIJO en SQL: solo filas que apuntan a jsDelivr; `image_url`
    e `images[]`. Reversible con backup/restore. Si falta una imagen, la app cae a
    un gradiente (no rompe).
  - Sin cambios de código de la app (el componente ya lee `image_url`).
  - Archivos: `supabase/{backup_exercise_images,restore_exercise_images,exercise_media_bucket,importar_imagenes_autohospedadas}.sql`,
    `scripts/subir_exercise_media.mjs`. Ver ADR-007 (Aceptada).

- **1.0.50**  — Seguridad: auditoría RLS + rastreo de errores (Sentry).
  `[GK-007 · 2026-07-14 · Security · Impacto Medio · Breaking No · SQL No · Config Si (opcional)]`
  - NUEVO `supabase/auditoria_seguridad.sql`: auditoría de SOLO LECTURA que
    descubre dinámicamente tablas sin RLS, tablas sin políticas, buckets públicos
    y políticas de Storage. Complementa `verificar_seguridad.sql` detectando
    tablas nuevas que no estén en su lista fija.
  - Rastreo de errores con `@sentry/nextjs`, integrado **solo en runtime** (sin el
    plugin de build, para no arriesgar Turbopack). Gated por DSN: sin
    `NEXT_PUBLIC_SENTRY_DSN` queda no-op y la app se comporta igual.
  - Los error boundaries (`error.tsx`, `global-error.tsx`) reportan a Sentry; la
    consola sigue sanitizada. `sendDefaultPii: false`.
  - Archivos: `instrumentation.ts`, `instrumentation-client.ts`,
    `sentry.server.config.ts`, `sentry.edge.config.ts`, edición de los dos error
    boundaries, `.env.local.example`.
  - Ver ADR-006 y ADR-012 (ahora Aceptadas) en `DECISIONS.md`.

- **1.0.49** — Sistema de documentacion y control de versiones.
  `[GK-006 · 2026-07-14 · Infrastructure · Impacto Bajo · Breaking No · SQL No · Config No]`
  - Normalizado y ampliado el sistema de docs SIN tocar codigo funcional de la app.
  - `CHANGELOG.md`: categorias Added/Changed/Fixed/Removed/Security/Performance +
    explicacion de Semantic Versioning.
  - `RELEASE_NOTES.md`: secciones fijas (que cambio, impacto, que revisar,
    config, migraciones SQL, rollback).
  - `ENGINEERING_LOG.md`: estructura consistente (Contexto, Sintoma, Causa raiz,
    Solucion, Decision de arquitectura, Archivos, Seguridad, Pruebas, Riesgos y
    rollback).
  - `VERSIONES.md`: quitada la palabra "(actual)" de todas las versiones antiguas
    (46 ocurrencias), marcada solo la ultima; agregados leyenda de metadatos e
    indice de versiones.
  - NUEVO `DECISIONS.md`: registro de decisiones (ADRs), incluye las 6 features de
    la hoja de ruta (seguridad, coach x nutricion, memoria del coach, push,
    offline) como **Propuestas**, para implementarlas una por version con pruebas.
  - Separacion publico/interno declarada en cada archivo. Sin secretos ni tokens.

- **1.0.48** — Retirada la funcion de animaciones de ejercicios
  (Everkinetic). Las imagenes eran de calidad pobre y no cumplian el estandar del
  producto. NO habia llegado a produccion (sin bucket, sin subir imagenes, sin
  correr import), asi que el usuario no ve ningun cambio: los ejercicios siguen
  con sus fotos actuales de dominio publico (free-exercise-db).
  - Eliminados: pagina /credits y sus enlaces (footer + Ajustes), los SQL
    exercise_media_bucket / import_exercise_animations / backup_exercise_images /
    restore_exercise_images, y ATTRIBUTION.md. Sin cambios en la base de datos.
  - NUEVO: sistema de documentacion por version. A partir de ahora, cada version
    actualiza tambien:
    * CHANGELOG.md — resumen breve por version, orientado al producto.
    * RELEASE_NOTES.md — explicacion funcional para el equipo y usuarios internos.
    * ENGINEERING_LOG.md — detalle tecnico: causas raiz, decisiones de
      arquitectura e implementacion.
    * VERSIONES.md — este historial, como hasta ahora.
  - Recordatorio: los fixes del crash al guardar en Configuracion y del tooltip
    en negro (1.0.45) siguen en el codigo; se activan al desplegar esta version.
    Sigue pendiente desactivar Attack Challenge Mode en el Firewall de Vercel.

- **1.0.47** — Mas ejercicios animados, con seguridad.
  - Palanca 1: el emparejador ahora trata las palabras de MUSCULO/relleno como
    holgura (igual que las de equipo), con los mismos guardias (subconjunto +
    antiambiguedad). Subio de 45 a **89 auto-emparejados**. Revisados a mano uno
    por uno: incline->incline, decline->decline, lying->lying, one-arm->one-arm,
    close-grip->close-grip. Ninguno cruzado.
  - Palanca 2: nuevo `CANDIDATOS_REVISION.md` con ~45 casi-match para aprobacion
    MANUAL (incluye aciertos y errores que a proposito NO se auto-aplicaron, como
    fly vs press). Marcas los correctos y esos se animan en una siguiente pasada.
  - `import_exercise_animations.sql` actualizado a los 89. Backup/restore/bucket
    sin cambios. Los ~210 no emparejados siguen con su foto estatica intacta.

- **1.0.46** — Animaciones de ejercicios (Everkinetic, CC BY-SA 4.0).
  - 45 ejercicios emparejados de forma SEGURA con Everkinetic (match por
    conjunto de tokens con holgura solo para palabras de equipo + guardia de
    ambiguedad: si hay duda, NO empareja). Revisado: incline->incline,
    decline->decline, close-grip->close-grip; nada cruzado.
  - Animaciones WebP en bucle (2 frames, 400x400, ~21KB c/u) generadas de los
    frames del repo. Los 299 ejercicios no emparejados quedan INTACTOS con su
    foto estatica actual de dominio publico.
  - Reversible: correr backup_exercise_images.sql ANTES; restaurar con
    restore_exercise_images.sql. La importacion solo hace UPDATE de image_url en
    los emparejados. El componente ya cae a un degradado si una imagen falla, asi
    que nada rompe la app.
  - Atribucion en UNA pagina publica nueva (/credits), enlazada desde el footer
    de la landing y Ajustes > Support & legal. Mas ATTRIBUTION.md en el repo.
  - Nuevos SQL: exercise_media_bucket.sql (bucket publico),
    import_exercise_animations.sql (UPDATE de los 45), backup/restore.
  - Pipeline y por-que de cada SQL explicados en el mensaje del chat.

- **1.0.45** — Fix del CRASH al guardar en Configuracion + tooltip.
  - CAUSA del crash ("Algo salio mal"): en `settings-form.tsx`, `save()`,
    `onChangePassword()` y `onDeleteAccount()` hacian `await` de un server action
    SIN try/catch. Si la llamada fallaba (red, timeout, o el Firewall de Vercel
    con Attack Challenge Mode), la promesa se rechazaba sin capturar y React lo
    mandaba al error boundary, tumbando toda la pantalla aunque el guardado
    hubiera funcionado o no.
  - FIX: los tres handlers ahora envuelven el await en try/catch y muestran un
    toast en vez de crashear. `finally` restablece el estado de carga.
  - Defensa extra: `profile/settings/page.tsx` ahora tolera que `getProfile()`
    lance (es fail-closed) durante el re-render posterior al guardado; si falla,
    renderiza un fallback y el formulario conserva su estado en el cliente, en
    vez de mostrar la pantalla de error.
  - Recordatorio: sigue pendiente desactivar Attack Challenge Mode en el Firewall
    de Vercel; puede estar detras de estos fallos de red intermitentes.
  - TOOLTIP de la grafica de intake: el texto salia en negro (ilegible en modo
    oscuro). Se fijo `itemStyle` a color claro.

- **1.0.44** — Net Energy convertido en "Calorie intake" + fixes de chat.
  - NET ENERGY -> INGESTA DE CALORIAS. Se elimino por completo el "quemado"
    estimado (confundia y sin wearable era adivinar). Ahora la pantalla es 100%
    real: calorias que COMISTE por dia (de nutrition_logs) vs tu META diaria.
    Barra verde si estas en o bajo la meta, naranja si te pasaste, con linea
    punteada de objetivo. Incluye promedio/dia, macros promedio (proteina, carbs,
    grasa) vs meta, dias registrados, y tabla de tendencias 3/7/14/30 dias.
    La meta usa `computeNutritionGoal` (la misma de la pestana de Nutricion).
  - Se quito la busqueda de `workout_sessions` y el calculo de BMR de esta
    pantalla. `getEnergyRaw` -> `getIntakeRaw` (comidas + meta). `energy.ts` ahora
    es logica de ingesta pura. La tarjeta en Nutricion dice "Calorie intake".
  - CHAT: el menu inferior ahora se OCULTA al escribir (el bar `fixed` flotaba
    feo cuando subia el teclado). Se detecta el foco de cualquier input/textarea.
  - CHAT: al abrir, ahora salta directo al ULTIMO mensaje (instantaneo, con
    reintentos por si cargan fotos), en vez de quedarse arriba. Ademas hay una
    flecha flotante para bajar al ultimo mensaje cuando subes a leer.
  - Landing: la seccion de "Net Energy" pasa a "Calorie intake" (comido vs meta).

- **1.0.43** — Ajustes a la landing segun feedback.
  - Fuera los guiones largos (—) entre palabras en todo el texto.
  - Fuera las lineas de "regla con marcas" entre secciones.
  - Ejemplo del encabezado: ya NO es el plato real del usuario. Ahora es una
    conversacion mas divertida y dinamica con Lucas (saltarse pierna), coherente
    con su voz real (motivador, con 💪🔥).
  - Seccion del coach: ejemplos mas realistas, en la voz de Lucas.
  - Nutricion: la seccion ahora habla SOLO de comer (comida escrita -> macros +
    24 recetas con gramos). Se saco de ahi lo de "quemado", que confundia.
  - Net Energy pasa a su PROPIA seccion, con explicacion clara: verde = comido,
    naranja = quemado ESTIMADO (perfil + entrenos, no un wearable).
  - Tren: el mockup ahora coincide con la pagina real de Tren (plan activo,
    badge de dias, split, pestanas por dia, ejercicios con sets × reps · kg).

- **1.0.42** — Landing rediseñada de raiz (`src/app/page.tsx`).
  - La anterior era el patron tipico de "startup con IA": fondo casi negro + un
    solo verde + pastilla con estrellita + sopa de iconos. Se quito TODO eso.
  - Cero iconos decorativos. En su lugar se muestra UI REAL del producto: una
    conversacion con el coach (Lucas/Helena) respondiendo con numeros, las
    barras de Net Energy (comido vs quemado), y una serie logueada con RPE,
    calculo de discos y descanso.
  - Lenguaje de datos de la app: numeros en la tipografia mono, verde = tu /
    comido / progreso, naranja = quemado / esfuerzo (igual que Net Energy).
  - Motivo de "regla con marcas" (sacado de los diales de nutricion) como
    divisor entre secciones, para que la pagina se cosa con el vocabulario del
    propio producto, no con adornos.
  - Solo datos verificables del codigo: 344 ejercicios (antes decia 280+), 24
    recetas, coach Lucas/Helena, ejemplo real del plato de res 720 kcal/42 g.
  - Sin informacion sensible, sin claves. Se conservan enlaces legales, correo,
    credito y WhatsApp de contacto tal cual estaban.

- **1.0.41** — La FOTO ahora queda en el chat del coach + sin marco.
  - CAUSA: al guardar el mensaje solo se escribia el texto; la referencia a la
    foto nunca se guardaba. La miniatura aparecia al enviar (render optimista)
    pero desaparecia al recargar, porque en la BD ese turno era solo texto.
  - FIX: nueva columna `image_path` en `coach_messages` (guarda la ruta en el
    bucket privado `coach-photos`). Al recargar la conversacion, la app genera
    una URL firmada de 1h desde esa ruta y vuelve a mostrar la miniatura. La
    ruta pasa por el cliente del usuario, asi que la RLS de Storage sigue
    garantizando que nadie ve la foto de otro.
  - Robusto ante orden de deploy: si aun no corriste el SQL, los mensajes de
    texto siguen guardandose igual (la columna solo se toca cuando hay foto), y
    el historial nunca desaparece por falta de la columna.
  - UI: la imagen enviada ya NO va dentro de la burbuja verde. Se muestra sola
    (solo la imagen, redondeada), y la burbuja de texto solo sale si escribiste
    algo. Quitado el placeholder "Sent a photo".
  - REQUIERE ejecutar `supabase/coach_imagen_en_chat.sql`.
  - VOZ: sigue igual (el codigo esta bien). El error es que falta saldo en la
    cuenta de OpenAI; en cuanto haya credito, funciona.

- **1.0.40** — Nueva pantalla **Net Energy** en Nutrición (calcada del
  estilo Bevel, pero solo con datos que la app SÍ tiene). Grafico de barras
  Eaten vs Burned por dia, selector 7D/30D/3M/6M, y tabla Trends Analysis
  (3/7/14/30-day, Avg/Total, Deficit/Surplus).
  - **Eaten**: 100% real, suma de `nutrition_logs.calories` agrupada por dia
    LOCAL (mismo patron que arreglo "This week"; el server trae ventana amplia y
    el cliente agrupa por timezone del telefono — nada de tabla resumen UTC).
  - **Burned**: ESTIMADO, nunca medido. BMR con la MISMA formula Mifflin-St Jeor
    de `nutrition-targets.ts` (mismo trato de genero/edad) x 1.2 (piso sedentario)
    + quema activa de las sesiones logueadas del dia (MET 5.0 x peso x minutos).
    Etiquetado como "(est.)" en la leyenda y con nota explicativa abajo.
  - Si falta peso/altura en el perfil: NO se inventa quema. Muestra solo Eaten y
    un aviso para completar el perfil.
  - Deliberadamente NO se replicaron Strain/Recovery/Sleep/Stress (necesitan
    wearable) ni Glucose (necesita CGM). Sin sensor, no hay dato.
  - Archivos: `src/lib/energy.ts` (funciones puras), `getEnergyRaw()` en
    `src/lib/data.ts`, `src/components/nutrition/net-energy-client.tsx`,
    `src/app/(app)/nutrition/energy/page.tsx`, y tarjeta de acceso en Nutricion.

- **1.0.39** — ARREGLADAS las fotos y la voz del coach.
  (1) CAUSA DEL "Connection issue" CON FOTO: se mandaba la imagen como base64
  dentro del JSON del coach, inflando el cuerpo de la peticion hasta que se
  rechazaba. Ademas la miniatura se veia rota (?) porque se usaba un blob: URL
  que se revocaba ANTES de mostrarlo.
  (2) SOLUCION (la que pediste): las fotos ahora se suben a Supabase Storage.
  Nuevo bucket privado `coach-photos` con RLS por carpeta de usuario (probado en
  Postgres real: un usuario ve 0 fotos de otro, ve 1 la suya). Nuevo endpoint
  /api/coach/photo que sube la foto y devuelve una URL firmada (1h). El coach
  recibe solo el PATH (texto corto), descarga la imagen del storage verificando
  que sea del propio usuario, y se la pasa a Claude. La miniatura usa la URL
  firmada, asi que sobrevive a recargas.
  (3) VOZ: el mismo "Connection issue" era un mensaje enganoso. Ahora distingue:
  503 = "Voice input isn't set up yet" (falta OPENAI_API_KEY), 401 = re-login,
  y solo dice error de red cuando de verdad no se pudo llegar al servidor.
  (4) El catch de enviar ya NO borra el mensaje del usuario si la respuesta
  llego. Antes borraba dos mensajes a ciegas, por eso desaparecia lo que
  escribias aunque el coach hubiera contestado.
  REQUIERE ejecutar supabase/coach_fotos.sql. Para la voz, configurar
  OPENAI_API_KEY en Vercel (ver 1.0.36).

- **1.0.38** — FOTOS AL COACH + el coach fija tus metas de calorias.
  (1) INTERFAZ DEL COACH rediseñada estilo Claude/WhatsApp: barra inferior con
  boton de adjuntar foto, microfono y enviar, todos alineados en una fila limpia;
  arriba, previsualizacion de la foto adjunta con boton de quitar. Nada de
  botones sueltos. La foto se muestra como miniatura dentro de la burbuja del
  usuario.
  (2) ENVIAR FOTOS AL COACH: ahora puedes mandarle una foto (una receta de un
  libro, tu foto de progreso, un plato) y opinar sobre ella. Reutiliza el patron
  probado de la nutricion: la imagen va como base64 directo a Claude, NO se
  guarda. Validacion de tipo y tamaño (<5MB) en cliente y servidor.
  (3) EL COACH FIJA TUS METAS: nueva herramienta set_nutrition_targets. Le pides
  "mira mi peso y estatura y dime cuantas calorias comer para tonificar", Lucas/
  Helena calculan y fijan las metas, que aparecen en la pestaña de Nutricion con
  su proteina y grasa. Si le faltan datos (peso/estatura), los pide antes de
  inventar.
  (4) La meta manual del coach MANDA sobre el calculo automatico Mifflin-St Jeor.
  Verificado: si el coach fija 2200, la app muestra 2200 aunque el calculo diera
  2310. Autocompleta los macros que el coach deje en blanco.
  (5) `metas_coach.sql`: columnas custom_calories/protein/carbs/fats en el perfil,
  con restriccion de sanidad (1000-6000 kcal). Probado en Postgres real: rechaza
  valores absurdos, idempotente.
  REQUIERE ejecutar supabase/metas_coach.sql.

- **1.0.37** — PRIVACIDAD Y AVISOS DE CIFRADO (con lenguaje honesto).
  (1) Politica de privacidad actualizada: ahora cubre fotos (comida, progreso,
  las que se manden al coach), notas de voz (se transcriben en OpenAI, no se
  guarda el audio) y datos de Apple Health. Se verifico con la doc de Supabase
  que el cifrado es AES-256 en reposo y TLS en transito, siempre activo.
  (2) Aviso de privacidad reutilizable (PrivacyNote) bajo cada punto donde se
  sube contenido: foto de comida (Nutrition), fotos de progreso, importar Apple
  Health. Enlaza a la politica.
  (3) En el coach, bajo el aviso de "no es consejo medico", se anadio: "Your
  conversation is encrypted and private to your account."
  (4) IMPORTANTE - lenguaje honesto: NO se afirma que "nadie mas puede verla".
  El cifrado en reposo protege ante robo del disco, pero como operador la app
  debe poder descifrar para funcionar. Prometer invisibilidad total seria falso y
  un riesgo legal con datos de salud. Se dice la verdad: cifrada y privada,
  accesible solo por el propio usuario al iniciar sesion; el operador accede solo
  para operar y dar soporte, nunca para vender datos.
  PENDIENTE (siguiente version): enviar fotos AL coach (recetas de un libro, foto
  de progreso) para que opine. Es una funcion mas grande; se separa para no
  mezclarla con los avisos legales.

- **1.0.36** — MENSAJES DE VOZ al coach (audio -> texto con Whisper).
  Claude no procesa audio, asi que el audio se transcribe ANTES de llegar al
  coach. Flujo: el usuario graba una nota de voz -> se sube a nuestro endpoint
  /api/coach/transcribe -> este la manda a Whisper de OpenAI -> vuelve el texto
  -> se coloca en el cuadro del coach para que el usuario lo REVISE y edite antes
  de enviar. Nada se envia solo.
  (1) La API key de OpenAI vive SOLO en el servidor (OPENAI_API_KEY), nunca en el
  navegador. El audio no se guarda; solo se devuelve el texto.
  (2) Boton de microfono en el compositor del coach. Aparece SOLO si el navegador
  puede grabar (MediaRecorder + getUserMedia); si no, no se muestra, sin boton
  muerto. Graba con el formato que soporte el navegador (webm/mp4/ogg).
  (3) El endpoint exige sesion iniciada (transcribir cuesta dinero), tiene su
  propio rate limit por IP, rechaza archivos >20MB y formatos no soportados, y
  nunca filtra el cuerpo de error de OpenAI ni el nombre de la variable.
  (4) Claude y OpenAI quedan separados: OpenAI solo convierte voz en texto; Claude
  (Lucas/Helena) responde a partir del texto y nunca ve el audio.
  REQUIERE configurar OPENAI_API_KEY en Vercel. Whisper cuesta ~$0.006/min.

- **1.0.35** — "THIS WEEK" ARREGLADO (dias fantasma).
  (1) El widget SI funcionaba (promedio real = suma de calorias / dias
  registrados), pero leia de `nutrition_days`, una tabla resumen que llena un
  trigger SQL agrupando por `logged_at::date` = fecha UTC. El mismo bug de zona
  horaria de Home, pero en la base de datos: una comida de la noche (hora local)
  recibe la fecha de manana en UTC y crea un "dia" extra. Por eso aparecian mas
  "days logged" de los reales.
  (2) `getWeekNutrition` ahora calcula DIRECTO desde `nutrition_logs`, agrupando
  por dia LOCAL con los helpers de local-date, y recorta el sobrante de la
  ventana UTC. Verificado en America/New_York: la cena de anoche cuenta como
  ayer, no crea un dia de mas.
  (3) `fitness-score.ts` tambien leia `nutrition_days` (inflaba el score de
  Nutrition con dias fantasma). Ahora reutiliza `getWeekNutrition`, ya corregido.
  (4) La tabla `nutrition_days` y su trigger quedan sin uso en lectura; no se
  eliminan para no romper el export ni el borrado de cuenta, pero ya no alimentan
  ninguna metrica visible.

- **1.0.34** — LOGIN CON GOOGLE + onboarding para todos + prompt de
  memoria abajo.
  (1) Boton "Continue with Google" en login y signup (Supabase OAuth). Nuevo
  `/auth/callback` que intercambia el code por la sesion en el servidor y maneja
  cancelaciones/errores redirigiendo a /login?error=oauth.
  (2) GUARD DE ONBOARDING EN EL LAYOUT: antes, el signup por email empujaba a
  mano a /onboarding, asi que Google se habria saltado la recoleccion de datos.
  Ahora el layout de (app) manda a onboarding a CUALQUIER usuario sin perfil
  completo, venga de email o de Google. Un solo punto de control. Sin bucle
  porque /onboarding vive fuera de ese layout.
  (3) El prompt "Can I remember you?" del coach se movio ARRIBA del compositor,
  pegado abajo, para verlo sin subir en el chat. Se agrupo con la caja de texto
  en un stack anclado al fondo (sin numeros magicos de posicion).

- **1.0.33** — FILA DE SERIES sin +/- y RECETAS mas detalladas.
  (1) Quitados los botones + y - de peso y reps. Ahora son campos amplios (91px)
  donde la persona escribe el numero y se abre el teclado numerico. Se conservo
  el selector de INTENSIDAD (RIR) como pediste. Columnas mas anchas al sobrar el
  espacio de los steppers.
  (2) RECETAS PRO: cada paso ahora guarda metodo (horno/fogon/licuadora/nevera),
  minutos y temperatura, y se muestran como etiquetas: "Oven · 200C", "12 min".
  Se detectan del texto y se heredan entre pasos (81% de cobertura; el resto son
  pasos de preparar/servir que no necesitan etiqueta). Nuevo dato "hands-on time"
  (tiempo activo) ademas del total, util cuando gran parte es horno o nevera.
  (3) `recetas.sql` regenerado: `steps` pasa de text[] a jsonb con esos metadatos,
  y trae una migracion robusta que actualiza una tabla de la version anterior sin
  perderla (probado sobre una tabla vieja en Postgres real).

- **1.0.32** — Ajustes pedidos.
  (1) RETIRADO el mapa muscular. La ficha de informacion del ejercicio vuelve a
  mostrar solo las instrucciones, como estaba. El componente se elimino por
  completo, sin referencias sueltas.
  (2) HOME: intercambiadas las tarjetas de "Calories left / Protein left" con la
  rejilla de "workouts / kg volume / vs last wk". Las calorias suben justo debajo
  del saludo, las estadisticas de la semana bajan tras "Today's focus". Se
  ajustaron los retardos de animacion para que la cascada siga entrando de arriba
  a abajo.

- **1.0.31** — BUG DE ZONA HORARIA EN HOME + MAPA MUSCULAR.
  (1) HOME CONTABA COMIDAS DE AYER. `getHomeStats` calculaba "hoy" con
  `toISOString()`, que da la fecha en UTC, y comparaba contra "T00:00:00" sin
  zona. Para alguien en UTC-4, la medianoche UTC son las 20:00 del dia anterior:
  la cena de anoche entraba en el presupuesto de hoy. Por eso Home decia 2.040
  kcal restantes y Nutrition decia 0 consumidas. Reproducido con numeros exactos.
  (2) LA CAUSA DE FONDO: el servidor corre en UTC y no sabe la zona del usuario.
  Ahora Home trae una ventana amplia de comidas y un componente de cliente
  (`TodayMacros`) filtra por el dia local del DISPOSITIVO, igual que Nutrition.
  Verificado en America/New_York: una comida a las 22:00 locales (que en UTC ya
  es manana) se cuenta bien como de hoy.
  (3) De paso, Progress mostraba las calorias de HOY como si fueran el promedio
  semanal. Ahora calcula el promedio real de los dias registrados.
  (4) MAPA MUSCULAR: nuevo `MuscleMap`, un cuerpo esquematico de frente y
  espalda dibujado en SVG por nosotros (nada que licenciar). Resalta el musculo
  objetivo en verde solido y los de apoyo atenuados. Aparece en la ficha de
  informacion del ejercicio, con leyenda. Cubre los 8 grupos musculares reales.

- **1.0.30** — SECCION DE RECETAS + el coach las conoce.
  (1) 24 RECETAS, seis por cada momento del dia (desayuno, almuerzo, cena,
  snack), coherentes con la ocasion. Cada una con gramos exactos por
  ingrediente, pasos detallados (incluida la tecnica: por que reposar la carne,
  por que prensar el tofu, por que guardar el agua de la pasta), consejos,
  alergenos, tiempo de preparacion y coccion.
  (2) LOS MACROS NO ESTAN INVENTADOS. Se calcularon sumando los gramos de cada
  ingrediente contra una tabla nutricional estandar (67 alimentos), y se
  verifico que las calorias cuadren con la regla 4/4/9. Las 3 recetas con
  desviacion >6% son las de mucha fibra, que aporta ~2 kcal/g y no 4: esperado.
  Todas cumplen el minimo de proteina (20g comidas, 15g snacks).
  (3) `supabase/recetas.sql`: tabla `recipes` con RLS de solo lectura para
  usuarios autenticados. Es catalogo publico, como `exercises`: no contiene datos
  de nadie, asi que NO repite el problema de `coach_knowledge`.
  (4) Pantallas: lista agrupada por comida y detalle con macros por racion,
  ingredientes en gramos, metodo numerado y avisos de alergenos.
  (5) "Log this meal": registra la receta con sus macros exactos, sin teclear.
  (6) EL COACH conoce el catalogo: recomienda por nombre segun los macros que le
  falten al usuario, y tiene prohibido inventarse recetas o macros que no esten
  en la lista.

- **1.0.29** — ARREGLADA LA FILA DE SERIES.
  (1) EL BOTON MENOS: la causa real era que `reps` empezaba VACIO. Restar de 0
  daba 0, asi que no pasaba nada. Ahora la serie arranca con el objetivo del plan
  ("8-12" -> 8), asi que restar y sumar funcionan desde el primer toque.
  (2) DESBORDAMIENTO: la fila pedia 112px por columna y solo habia 99 en una
  pantalla de 390px. Ademas el placeholder "8-12" era ancho y empujaba. Ahora la
  rejilla es mas estrecha (steppers de 36px, check 40x44) y cabe con holgura.
  (3) FUERA EL TECLADO EN RIR: era un campo de texto. Ahora es un selector que
  se abre al tocar, con el significado de cada numero (4+ Light, 3 Moderate,
  2 Hard, 1 Very hard, 0 Max) y un "Skip, I'm not sure".
  (4) FUERA EL TEXTO QUE CONFUNDIA: la linea "RIR = reps in reserve..." se quito.
  La explicacion vive ahora dentro del selector, donde hace falta.

- **1.0.28** — ARREGLOS DE LA PANTALLA DE SESION + DESCANSO INTELIGENTE.
  (1) BOTON "SALIR" INVISIBLE: el dialogo de abandonar entreno tenia el boton,
  pero usaba `bg-bad`, un token que NUNCA se definio en globals.css. Resultado:
  fondo transparente y texto blanco sobre dialogo blanco. Faltaban tres tokens
  (--color-signal, --color-signal-ink, --color-bad) que tambien afectaban a
  Badge, BottomNav y la libreria de ejercicios. Anadidos.
  (2) Textos en espanol en la UI inglesa: "Continuar"/"Salir" en el dialogo y
  "Continuar" en el onboarding. Traducidos.
  (3) "Barras · Gimnasio_completo": se imprimian los valores crudos de la BD.
  Ahora usan equipmentLabels ("Barbell · Full gym").
  (4) El boton menos SI funcionaba: quitaba la serie, pero la etiqueta mostraba
  las series PLANIFICADAS (4) en vez de las reales (3), asi que parecia roto.
  Ahora muestra el numero real.
  (5) TARGETS TACTILES: los +/- median 28px. Ahora 40px, el check y el RIR 44px,
  y anadir/quitar serie 48px con etiqueta de texto. El peso sube de 2.5 en 2.5
  (medio disco por lado), no de 1 en 1.
  (6) DESCANSO POR EJERCICIO (src/lib/rest.ts): el descanso ya no es un numero
  fijo. Compuesto pesado 2:00, compuesto 1:30, aislamiento 1:00, core y cardio
  0:45. Ajustable de 10 en 10 segundos con botones grandes, entre 20s y 5min. El
  ajuste se recuerda para ese ejercicio durante la sesion y afecta a la cuenta
  atras en curso.

- **1.0.27** — REDISENO DE LA PANTALLA DE SESION, inspirado (no copiado)
  en apps de registro de entrenamiento.
  (1) CARRUSEL DE MINIATURAS arriba, en vez de puntitos: ves lo hecho (con check
  y atenuado), lo actual (resaltado) y lo que viene. Se puede saltar tocando.
  (2) CHIP DE DESCANSO en la cabecera: muestra el descanso previsto y cuenta
  atras en vivo cuando terminas una serie.
  (3) SUBTITULO DE EQUIPAMIENTO bajo el nombre del ejercicio (ej. "Barbell").
  (4) CALCULADORA DE DISCOS: la columna de peso ahora dice "KG bar + plates" y
  bajo cada serie indica que discos poner por lado (ej. "1x25 + 1x20 + 1x2.5 per
  side"). Solo aparece en ejercicios con barra. Avisa si el peso exacto no se
  puede montar con discos estandar. Probado con 561 pesos de 20 a 300kg: la suma
  siempre cuadra y nunca carga de mas.
  (5) BOTONES - / + para quitar o anadir una serie sobre la marcha.
  PENDIENTE (no es codigo): las demostraciones animadas del ejercicio. La app ya
  soporta `image_url`; falta conseguir medios con licencia. NO se deben copiar los
  de otra app.

- **1.0.26** — STREAMING + LIMITE POR RAFAGA.
  (1) STREAMING: el coach ahora escribe delante de ti en vez de aparecer entero
  a los 3 segundos. Protocolo NDJSON (una linea JSON por evento). Soporta la
  herramienta de rutinas: transmite, avisa "Building your plan", y luego
  transmite la presentacion. El texto va en crudo y al final se sustituye por la
  version limpia (stripFormatting no se puede aplicar a fragmentos porque hace
  trim y colapsa espacios; se descubrio probandolo).
  Reintentos solo antes del primer byte: reintentar a medias duplicaria texto.
  (2) LIMITE POR MINUTO por usuario: 6/min en free, 12/min en pro. Contador
  atomico en Postgres (`bump_ai_minute`), verificado con 20 llamadas concurrentes
  (1..20 sin perder incrementos) y con RLS (un usuario no ve ni toca el contador
  de otro). Si el SQL no se ha ejecutado, se omite en vez de bloquear a nadie.
  (3) checkAndBumpLimit ahora FALLA CERRADO. Antes, si la comprobacion fallaba,
  se permitia la llamada sin contarla: cualquiera que provocara un error podia
  gastar el presupuesto del modelo sin limite.
  (4) El limite por IP en memoria se conserva como primera barrera, documentado
  como poco fiable en serverless (memoria por instancia) y duro con redes
  compartidas como el wifi de un gimnasio.
  (5) Se elimino otra fuga: el mensaje de "falta la API key" nombraba la variable
  de entorno al usuario.
  Requiere ejecutar `supabase/limite_por_minuto.sql`.

- **1.0.25** — ESCALABILIDAD: menos llamadas a Supabase por peticion.
  Hallazgo clave: la app NO abre conexiones directas a Postgres (no hay pg,
  Prisma ni DATABASE_URL). Todo va por HTTP a PostgREST, que tiene su propio
  pool. El agotamiento clasico de pool NO es un riesgo aqui.
  El cuello real era `auth.getUser()`, una llamada de RED, invocada por cada
  funcion de datos por separado: una sola carga de /home hacia SEIS.
  (1) Nuevo `src/lib/supabase/user.ts` con `getCurrentUser()` envuelto en
  `cache()` de React, con timeout y fail-closed. Todas las funciones de servidor
  (data.ts, fitness-score, achievements, health-data, limits, routine-builder)
  ahora comparten una unica llamada por peticion.
  (2) VERIFICADO empiricamente dentro de Next: `cache()` deduplica en Server
  Components (5 llamadas -> 1), pero NO en route handlers (siguen siendo 5).
  La documentacion daba a entender lo contrario.
  (3) Por eso, en la ruta del coach se pasa el `userId` ya verificado por
  checkAndBumpLimit a loadContext, en vez de volver a preguntar. 2 -> 1.
  Resultado medido: /home 6 -> 2, coach 2 -> 1, /nutrition 4 -> 2.

- **1.0.24** — RENDIMIENTO Y RESILIENCIA CON MUCHOS USUARIOS.
  (1) El aprendizaje de memoria era una SEGUNDA llamada al modelo que se ejecutaba
  ANTES de responder: cada mensaje esperaba ~1.8s de mas. Ahora se ejecuta con
  `after()` de Next 16, despues de enviar la respuesta. Latencia de 4.8s a 3.0s.
  (2) REINTENTOS con backoff exponencial y jitter para 429 (rate limit), 529
  (Anthropic sobrecargado) y 5xx. Antes, una sobrecarga = error visible. Probado
  contra un servidor real: un 529 doble se recupera solo.
  (3) TIMEOUT de 25s por intento con AbortController: una llamada colgada ya no
  retiene una funcion serverless hasta que Vercel la mata.
  (4) Un 400 o 401 NO se reintenta (fallaria igual y gasta capacidad).
  (5) maxDuration=60 en la ruta del coach: Vercel ya no corta la funcion antes de
  tiempo cuando el modelo tarda.
  (6) SEGURIDAD: la ruta del coach devolvia el error crudo al cliente y los
  mensajes revelaban nombres de variables de entorno. Ahora el usuario ve un texto
  amable, sin codigos ni internos, y el detalle solo va al log del servidor.

- **1.0.23** — ARREGLADO: apagar la memoria ya NO borra los recuerdos.
  Antes, desactivar el interruptor borraba todo en el servidor. Eso era una mala
  decision: ahora apagar es una PAUSA. El coach deja de leer y de anadir memorias,
  pero nada se destruye, asi que si el usuario reactiva al dia siguiente todo sigue
  ahi. Borrar es un acto aparte y deliberado: el boton de la papelera (un recuerdo)
  o "Forget everything" (todos).
  La tarjeta ahora muestra los recuerdos aunque este pausada, atenuados y con la
  etiqueta "Saved, but paused", para que el usuario vea que no se perdieron.
  El coach describe la pausa con honestidad y ya no dice que no guarda nada.

- **1.0.22** — Ajustes de la tarjeta de memoria del coach.
  (1) MOVIDA a la primera pagina de Perfil, justo debajo de las opciones y antes
  de Sign out. Antes quedaba enterrada en Settings, por debajo del boton de borrar
  cuenta y del numero de version.
  (2) ARREGLADO el interruptor: el circulo blanco se salia de la pista porque
  estaba en `absolute` sin un `left` definido. Ahora tiene anclaje explicito
  (left-1) y recorre 20px dentro de una pista de 48px, con 4px de margen a cada
  lado en ambos estados.
  (3) Arreglado "Level: avanzado" en Perfil: ahora traduce a Beginner /
  Intermediate / Advanced con el mapa de etiquetas que ya existia.

- **1.0.21** — CONSENTIMIENTO DENTRO DEL COACH. En vez de un interruptor
  escondido, la primera vez que un usuario abre el coach aparece una tarjeta:
  "Can I remember you?" con botones Si / No, explicando que solo el lo ve, que
  puede leer y borrar todo, y que puede cambiarlo en Ajustes. Se le pregunta UNA
  sola vez: la respuesta (sea cual sea) se guarda en `coach_memory_prompted_at` y
  no se le vuelve a molestar. Sin respuesta, la memoria sigue APAGADA.
  El coach ahora sabe si su memoria esta encendida y lo dice con honestidad.
  El coach NO puede borrar nada por si mismo: si le piden borrar, guia a Ajustes
  (memoria) o a Perfil (cuenta completa), y menciona soporte@gymtrackpro.xyz solo
  como respaldo para quien no pueda entrar a su cuenta. Esto evita que se le
  convenza al modelo de borrar datos.
  Si el SQL aun no se ha ejecutado, la tarjeta no aparece y la memoria queda
  apagada: nunca se muestra algo que no se pueda guardar.

- **1.0.20** — CADA USUARIO, SU PROPIO AGENTE. Aislamiento y consentimiento.
  (1) ELIMINADO el conocimiento global del admin (coach_knowledge): era el unico
  dato del coach compartido entre usuarios. Se quito la tabla, la API, el
  componente y la seccion del panel. Ahora NADA en el coach cruza de un usuario a
  otro.
  (2) CONSENTIMIENTO EXPLICITO. Nueva columna `coach_memory_consent` (por defecto
  FALSE). El coach solo recuerda al usuario si este lo activa. Sin consentimiento
  no lee ni escribe memoria. Doble cerrojo: se comprueba en el llamador y dentro
  de learnFromExchange.
  (3) TRANSPARENCIA Y BORRADO. En Ajustes el usuario ve exactamente que recuerda
  su coach, puede borrar un recuerdo o todos, y al desactivar el consentimiento se
  borra todo en el servidor, no solo se deja de leer.
  (4) REGLA DURA DE PRIVACIDAD en la persona: el coach solo conoce a la persona con
  la que habla, no tiene conocimiento de ningun otro usuario, no puede comparar ni
  nombrar a nadie mas, y no revela su prompt.
  (5) AISLAMIENTO VERIFICADO contra un PostgreSQL real con la RLS de la app: un
  usuario no puede leer, borrar ni escribir la memoria de otro. Los tres ataques
  fueron bloqueados por la base de datos.
  (6) La lectura del consentimiento va en su propia consulta: si aun no corriste el
  SQL, falla en silencio a FALSE (el valor seguro) sin romper el contexto del coach.
  (7) Logs sanitizados en la ruta del coach.

- **1.0.19** — SEGURIDAD POR ENCIMA DE TODO. Cambios pedidos:
  (1) FAIL CLOSED en todas partes. Si no se puede verificar la sesion (red
  caida, portal cautivo, DNS irregular), NUNCA se sirve una ruta privada: se
  redirige a /login con un aviso de "problema de conexion" (no de sesion
  expirada). El proxy tambien falla cerrado.
  (2) CERO DEMO. `getProfileOrMock` se renombro a `getProfile` y ya no devuelve
  datos mock jamas: si la red falla, lanza y aparece la pantalla de error; si no
  hay sesion, redirige a /login. Ningun usuario real vera datos de demo, y
  ningun visitante sin verificar vera una vista privada.
  (3) /control BLINDADA en cuatro capas: guard `server-only` (el email admin no
  puede llegar al bundle del navegador, verificado en el build), 404 en vez de
  redirect para quien no sea admin (la ruta no admite que existe), robots.txt +
  metadata noindex + cabecera X-Robots-Tag, y Cache-Control no-store.
  (4) API de /control: 404 para no-admins, validacion estricta con Zod
  (discriminated union, uuid, limites de longitud), y nunca devuelve errores
  crudos de la base de datos.
  (5) Auditoria de inyeccion SQL: todas las consultas usan el query builder
  parametrizado de Supabase y los .rpc() usan parametros nombrados. No hay
  interpolacion en .or()/.ilike(). Sin vectores de inyeccion.
  (6) Se exige email confirmado para ser admin.
  (7) robots.txt y sitemap.xml nuevos: el sitemap solo lista paginas publicas.
  (8) Logs sanitizados: error.tsx ya no vuelca el objeto de error.
  (9) El acento colombiano es SOLO para respuestas en espanol. En ingles el coach
  responde exactamente como siempre: calido, amable, tono de entrenador, sin
  ninguna expresion en espanol.

- **1.0.18** — AUDITORIA DE CARGA DE LA PWA + panel de control + coach.
  (1) Arreglado el congelamiento en redes publicas/lentas/portal cautivo: se
  encontraron DOS causas raiz. Primera: `(app)/layout.tsx` esperaba el perfil de
  Supabase sin timeout, y el middleware llamaba a `getUser()` sin timeout en cada
  request, asi que una red colgada dejaba la app en blanco para siempre. Segunda:
  si la llamada de auth RECHAZABA (DNS caido, portal cautivo), el middleware
  lanzaba excepcion y devolvia 500 en todo el sitio. Ahora hay timeouts
  (`with-timeout.ts`), captura de errores y una red de seguridad en `proxy.ts`.
  La app SIEMPRE renderiza. Auth y RLS intactos: si no hay sesion, sigue
  redirigiendo a /login. En timeout se muestra un perfil vacio, nunca datos mock.
  (2) Cache del service worker subida a v3 para purgar assets viejos.
  (3) PANEL DE CONTROL mas completo: 6 metricas en vivo (usuarios, llamadas IA
  hoy, entrenos totales y de la semana, comidas, conversaciones del coach, eventos
  de seguridad).
  (4) ENSENAR AL COACH: nueva seccion en /control para darle conocimiento a Lucas
  y Helena sin tocar codigo. Se guarda en la tabla `coach_knowledge` y se inyecta
  en su contexto. Requiere correr `supabase/coach_knowledge.sql`.
  (5) Lucas y Helena ahora hablan con un acento colombiano neutral y amigable en
  espanol (tu, "de una", "tranqui", "vas muy bien"), sin exagerar la jerga.

- **1.0.17** — Quitado el logo del triangulo (lo usa otra app). Restaurado
  el logo anterior (barras ascendentes) en toda la app: componente, iconos PWA,
  favicon, apple-icon y OG image. Se mantiene el arreglo de zona horaria de 1.0.16.

- **1.0.16** — Nuevo LOGO integrado en toda la app (iconos, favicon,
  topbar, landing, OG image). Arreglada la ZONA HORARIA: la app ahora usa la hora
  LOCAL del dispositivo (movil/tablet/PC) para agrupar los dias de nutricion. Antes
  usaba UTC, por eso las comidas de hoy aparecian en "dias anteriores" para usuarios
  fuera de GMT (ej. Cincinnati a las 10PM se veia como el dia siguiente). Helper
  local-date.ts reutilizable.

- **1.0.15** — Arreglado el texto en ESPAÑOL en la biblioteca de
  ejercicios. Las etiquetas force/mechanic (Empuje/Tirón/Compuesto) ahora se
  muestran en ingles (Push/Pull/Compound) via label maps, y las descripciones
  genericas en español se regeneran en ingles. Incluye SQL (traducir_a_ingles.sql)
  para arreglar los datos guardados en Supabase de una vez.

- **1.0.14** — Tres mejoras al fitness score y entrenamiento. (1)
  CHECK-IN post-entreno: al terminar, un cuestionario rapido (que tan dificil,
  energia, recuperacion) que alimenta el Recovery real del score. (2) TIPS
  ACCIONABLES en el fitness score: bajo las barras sale un consejo concreto para
  subir el componente mas bajo. (3) DETECCION DE RECORDS (PRs): al terminar, si
  superaste tu mejor peso en un ejercicio, sale una celebracion con el record.

- **1.0.13** — (1) Auto-relleno de sets: al completar un set, el
  siguiente se pre-llena con el mismo peso y reps como punto de partida (menos
  tecleo, y ves los numeros a igualar o superar). (2) Pista de esfuerzo en el
  descanso: segun el RIR que pusiste, te sugiere subir peso, mantener o bajar.
  (3) Los dias de la semana en Train ahora seleccionan automaticamente el dia
  ACTUAL segun tu zona horaria local (si hoy es viernes, abre Friday, no Monday).

- **1.0.12** — ARREGLADO Swap: ahora la pantalla de entrenamiento carga
  tu RUTINA REAL de Supabase (antes usaba datos de prueba), asi el Swap muestra
  alternativas reales del mismo musculo de tu biblioteca de ejercicios. Nuevo
  HISTORIAL DE NUTRICION en la pagina Nutrition: tarjeta discreta "Previous days"
  con los ultimos 7 dias, cada dia se despliega y muestra sus platos con desglose.
  Calendario ahora detecta el dia de HOY en tu zona horaria local (no UTC) y lo
  marca con un anillo verde. El coach ya usa tu zona horaria del dispositivo.

- **1.0.11** — Mejorado el flujo de ENTRENAMIENTO (inspirado en apps
  como MyFitCoach, sin copiar). (1) PANTALLA DE RESUMEN antes de empezar: muestra
  el nombre del dia, numero de ejercicios, sets, minutos estimados, los musculos
  que se trabajan, y la lista completa de ejercicios con miniatura. Boton grande
  Start workout. (2) Columna RIR en cada set (reps en reserva) para medir esfuerzo,
  se guarda para que el coach lo use. (3) Boton SWAP para cambiar un ejercicio
  sobre la marcha por otro del mismo musculo (util si la maquina esta ocupada).

- **1.0.10** — ARREGLADOS 3 bugs: (1) Home no mostraba calorias/proteina
  (leia de nutrition_days con desfase de zona horaria; ahora suma las comidas del
  dia directo). (2) Lucas decia que no veia tu nutricion; ahora calcula todo
  directo de tus comidas (3 dias + promedio 7 dias) y tiene instruccion explicita
  de que SI puede verlo. (3) El calendario de entrenamiento no aparecia (estaba
  escondido si no tenias datos); ahora SIEMPRE se muestra en Progress con tus
  dias reales de entreno.

- **1.0.9** — RANGO DE INCERTIDUMBRE en las estimaciones de comida:
  ahora muestra 720 kcal con su rango (650-790), mas amplio si la confianza es
  baja. Es honesto y se ve pro. ARREGLADO el bug del contador TODAY que sumaba
  comidas de otros dias (ahora filtra un solo dia con limite superior). Las
  comidas registradas ahora son CLICKEABLES: al tocarlas se despliega una
  tarjeta con el desglose del plato (que contiene, porciones), no solo al subir
  la foto.

- **1.0.8** — El coach ahora ve el detalle de nutricion de los ULTIMOS
  3 DIAS (antes solo hoy), agrupado por dia con comidas y totales, para detectar
  patrones. Nuevo CALENDARIO DE ENTRENAMIENTO en Progress: muestra en verde los
  dias reales que entrenaste cada mes (datos reales de tus sesiones), se puede
  navegar entre meses. Confirmado: el coach ya tiene contexto de fecha y hora.

- **1.0.7** — El coach (Lucas/Helena) ahora VE tu nutrición: las
  calorias y macros de hoy, cada comida registrada con su desglose, y tu
  promedio de la semana. Asi da consejos concretos sobre tu alimentacion real
  en vez de genericos (ej. "te faltan X g de proteina hoy").

- **1.0.6** — Arreglado el crash de la pagina /body ("A problem
  repeatedly occurred"). Ahora tiene su propio error boundary y las consultas
  son a prueba de fallos, asi que aunque falten las tablas de salud la pagina
  nunca crashea, solo muestra estado vacio. (Igual hay que correr health_data.sql
  para que el import guarde.)

- **1.0.5** — Quitada la K duplicada del saludo (queda solo la fija de
  arriba). Import de Apple Health arreglado de raíz: ahora agrupa la frecuencia
  cardíaca por día EN EL TELEFONO antes de subir, así un archivo de 9.6MB se
  envía como 13KB (bajo el limite de Vercel). Aguanta archivos enormes. Mensajes
  de error claros en cada paso del upload. accept del archivo mas flexible en iOS.

- **1.0.4** — Página Body ahora usa datos REALES (antes mostraba las
  medidas de Sofía: 64.2kg, waist 71cm, etc.). Guardar medidas funciona de verdad.
  Readiness (el 58) ahora solo sale con entrenamientos reales, no con comidas.
  Botón de perfil (inicial) fijo en la barra superior junto a la lupa, siempre
  visible sin subir. Import de Apple Health arreglado: filtra el XML en el
  navegador (99.9% mas pequeño) para que no falle por tamaño. Tarjeta de calorías
  rediseñada, no queda apretada. Quitado ultimo em-dash de nutrición.

- **1.0.3** — Panel admin movido de /admin a /control (con tu correo).
  Eliminados los guiones tipo raya de toda la web y landing (menos aspecto de IA).
  Coach: refuerzo anti-símbolos + limpieza automática de formato en cada respuesta.
  Coach ahora aprende del usuario (guarda datos durables: lesiones, horario,
  preferencias, equipo). Train marca los días completados de la semana con check
  y resalta el día que sigue.

- **1.0.2** — Import de Apple Health (FC, distancia, ejercicios) en
  página Body. Versión unificada (antes Perfil decía v0.2 y Settings 1.0.0).
  Estado vacío visible para datos de salud. Imagen de redes en formato historia
  con gráfica. Calorías personalizadas por perfil. Aviso de completar perfil.
- **1.0.1** — Logros, fotos de progreso, deload, peso rápido, plantillas de
  rutina, resumen semanal, registro offline, imagen para redes.
- **1.0.0** — Base: coach IA, rutinas, nutrición, foto de comida, PWA, push.

## Cómo subir de versión (cada vez que subas un zip)

1. Abre `src/lib/version.ts`.
2. Sube el último dígito: 1.0.2 → 1.0.3 → 1.0.4 …
   (usa el segundo dígito para cambios grandes: 1.1.0)
3. Guarda, empaqueta el zip, sube a Vercel.
4. En la web, entra a Perfil o Settings y confirma que el número cambió.
   Si sigue mostrando el anterior, el deploy no se aplicó.
