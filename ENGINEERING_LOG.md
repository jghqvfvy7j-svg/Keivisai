# Engineering Log

Registro técnico: decisiones de arquitectura, causas raíz de bugs y detalles de
implementación. El más reciente arriba.

---

## v0.11.0-rc.2 — Auditoría pre-deploy (P1: deps, build, CSP)

**Upgrade de Next (14.2.35 → 15.5.20).** El `npm audit` mostró 1 crítica + 2 altas; las de
Next se corrigen en ≥15.5.16 (la línea 14.2 no tiene parche). Adaptación a Next 15:
`cookies()` pasa a asíncrono → `createClient()` del servidor ahora es `async` y todas sus
llamadas usan `await` (25 archivos); los `params` de rutas dinámicas son `Promise` →
`await params` en `goals/[id]`. `tsc` estricto forzó y verificó cada cambio; build ✓.

**Vitest 2 → 4.** Corrige la crítica (servidor UI de Vitest, que no usamos) y las de
vite/esbuild (dev). 107 pruebas siguen verdes.

**Reproducibilidad.** Versiones directas fijadas a exactas; `engines.node >=20.11`;
`.nvmrc=22`; lockfile regenerado; `npm ci` instala limpio.

**CSP.** Añadida en `next.config.mjs`: `default-src 'self'`, `connect-src` con Supabase
(https+wss), OpenAI y Google; `frame-ancestors 'none'`, `object-src 'none'`,
`base-uri/form-action 'self'`, `upgrade-insecure-requests`. `script-src` mantiene
`'unsafe-inline'` (hidratación de Next) y `'unsafe-eval'` sólo en dev; pendiente migrar a
nonce. `style-src 'unsafe-inline'` por los estilos inline/Tailwind.

**Secretos.** Verificado por grep: ningún `'use client'` importa admin/server/getServerEnv;
las claves sólo se usan en rutas/módulos de servidor; ninguna variable `NEXT_PUBLIC_` es un
secreto.

**Riesgo aceptado.** 2 moderadas restantes = `postcss` bundleado por Next (build-time, CSS
propio). No explotable en runtime; se cierra cuando Next lo actualice.

## v0.11.0-rc.1 — Auditoría pre-deploy (P0)

**IDOR en el asistente (causa raíz).** `respond` aceptaba `conversationId` del cliente y
operaba con el cliente admin (`service_role`), que **omite RLS**. La inserción del mensaje
usaba ese id sin verificar dueño, y la lectura del historial filtraba sólo por
`conversation_id`. Con un id ajeno, un usuario podía escribir en y leer la conversación de
otro. Corrección: verificar `assistant_conversations` por `id + user_id` (403 si no
pertenece) antes de cualquier escritura/lectura, y añadir `.eq('user_id', user.id)` al
historial (defensa en profundidad).

**Lección/regla.** Cualquier ruta que use `service_role` con un identificador provisto por
el cliente DEBE re-verificar la propiedad explícitamente; RLS no protege esa ruta.

**Barrido.** Revisadas las 14 rutas con `createAdminClient`: `actions`, `gmail/feedback`,
`google/sync`, `schedule/confirm`, `mcp/tokens` ya filtraban por `user_id`; el resto
resuelve el usuario de la sesión o del token MCP. `respond` era el único caso.

## v0.11.0 — Endurecimiento

**Rate limiting.** Ventana fija pura y probada (`lib/security/rate-limit`), con store en
memoria e inyección de `now` para pruebas. `checkRateLimit(key, limit, windowMs)` se usa
en las rutas sensibles (429 al superar). Nota: en memoria es por instancia; para
multi-instancia, store compartido con la misma API.

**Cabeceras.** En `next.config.mjs`: HSTS, `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy` (cámara para la foto de horario; micrófono y
geolocalización deshabilitados). `poweredByHeader: false`.

**Logger.** `lib/log` emite JSON con filtrado por nivel y sink inyectable (probado).

**Accesibilidad.** Enlace "saltar al contenido" a `#contenido`, `:focus-visible` global,
`reduced-motion` ya existente, HTML semántico y `aria-live` en estados clave.

**E2E.** Playwright (`tests/e2e`) separado de Vitest (`src/**/*.test.ts`) por directorio
y extensión; `webServer` levanta `next dev` o usa `E2E_BASE_URL`. Requiere navegadores +
servidor, por lo que se ejecuta en el entorno del usuario.

**Cierre.** 107 pruebas unitarias verdes, typecheck estricto sin errores y build de
producción correcto en cada fase.

## v0.10.0 — Servidor MCP

**Endpoint como Route Handler.** En vez de un paquete/servidor aparte, el MCP vive en
`/api/mcp` (JSON-RPC 2.0 sobre HTTP POST: initialize/tools.list/tools.call/ping),
reutilizando el registro de herramientas del asistente. Sólo se exponen las de riesgo
`none`; las destructivas se excluyen (spec §31). El `dispatcher` tiene inyección de
dependencias y se prueba sin red (9 pruebas).

**Tokens revocables.** `generateMcpToken` crea `mcp_<base64url(32B)>`; se guarda sólo el
hash SHA-256. El endpoint autentica por hash (service_role), actualiza `last_used_at` y
resuelve el `user_id` del token (nunca del modelo). Gestión (crear/listar/revocar) por
`/api/mcp/tokens`.

**Bug corregido (privilegios de columna).** El primer diseño protegía `token_hash` con
`REVOKE SELECT (col)`. Se verificó contra Postgres que **no funciona** si el rol tiene
`SELECT` de tabla (Supabase lo concede): Postgres ignora el revoke de columna. Se
rediseñó `mcp_tokens` como **tabla de servidor** (RLS sin políticas + `REVOKE ALL` a
`anon/authenticated`), gestionada sólo con `service_role`. Regla general: para ocultar
columnas sensibles no basta el revoke por columna; hay que quitar el acceso del cliente
o usar esquema `private`/funciones security definer.

## v0.9.0 — Automatizaciones y centro de actividad

**Detectores puros.** `detectIncompleteSessions`, `detectDuplicateEvents` (por
`dedupeKey` o título+inicio) y `detectConflicts` (solapamiento de eventos que ocupan
tiempo) son puros y probados. `recommendDeliveryBlock` propone 3 h tras el último
turno/gimnasio con buffer de 30 min, respetando un límite de hora de inicio y sin
solaparse. 6 pruebas.

**Runner compartido.** `runAutomationsForUser(admin, userId)` reutiliza los detectores
y la lógica de metas (dominio) para recalcular `goal_progress` y registra un
`automation_runs`. Lo consumen dos endpoints: `/api/automations/run` (sesión, botón
manual) y `/api/cron/run` (todos los usuarios, protegido por `CRON_SECRET`, patrón que
Vercel Cron completa añadiendo `Authorization: Bearer <CRON_SECRET>`).

**Silencioso por diseño (spec §6/§21).** Ninguna automatización notifica; los
resultados se ven en el Centro de actividad, que lee `automation_runs` y `audit_logs`
(ambas con RLS select-own). `vercel.json` define el cron horario.

## v0.8.0 — Gmail

**OAuth: callback compartido por `state`.** Para no registrar un segundo redirect URI
ni añadir variables de entorno, calendario y Gmail usan el mismo `/api/google/callback`.
El `state` codifica `{ n: nonce, k: 'calendar' | 'gmail' }` (base64url); el nonce se
valida contra una cookie httpOnly (CSRF) y `k` decide en qué tabla se guardan los
tokens. `googleAuthUrl` ahora recibe `scopes`.

**Tokens de Gmail.** Migración `0004` con RPCs security definer
(`upsert/get/update/disconnect_gmail`) sobre `private.gmail_integrations`, sólo
ejecutables por `service_role`. Validado contra Postgres 16.

**Clasificación pura y con aprendizaje.** `classifyEmail` (dominio + palabras clave,
con seguridad de máxima prioridad y promociones degradadas) acepta `UserRule[]`
derivadas del feedback del usuario (por dominio), que tienen prioridad. `parseGmailMessage`
extrae remitente/asunto/fecha/snippet de la estructura de Gmail. 7 pruebas.

**Acceso mínimo y control silencioso.** El sync lee metadata (`format=metadata`) +
snippet, clasifica y hace upsert en `email_summaries` (tabla de servidor). No se
envían notificaciones: el dashboard muestra un indicador discreto y `/correos` lista
los importantes. El feedback recalcula `requires_attention` y alimenta el clasificador.

## v0.7.0 — Importar horario por foto

**Separación visión / dominio.** La extracción con el modelo de visión
(`src/lib/ai/vision.ts`, Responses API con `input_image`) queda aislada y devuelve
sólo filas `{date, code}` validadas con Zod. La conversión a eventos
(`src/lib/schedule/`) es **pura y probada**: `normalizeCode` (variantes AM/PM/OFF/
Utility), `codeToTimes` (OFF→null, desconocido→UNKNOWN, almuerzo sólo si cae dentro
del turno) y `buildEventsFromSchedule` (genera trabajo+almuerzo, reporta códigos y
fechas inválidas, acumula días OFF). 7 pruebas nuevas.

**Privacidad.** Por defecto NO se guarda la imagen (spec §11): sólo los datos
extraídos en `schedule_imports` con estado `revision`. Nada se escribe en el
calendario hasta que el usuario confirma la vista previa (`/api/schedule/confirm`),
que además valida `endsAt >= startsAt` y fija `reminders_enabled = false`.

**Límite de tamaño.** La ruta de extracción rechaza imágenes por encima de ~6 MB
(413) para acotar coste y payload.

## v0.6.0 — Google Calendar

**Decisión: tokens en esquema `private` + RPC security definer.**
Los tokens OAuth cifrados viven en `private.google_calendar_integrations`. PostgREST
sólo expone el esquema `public`, así que el servidor no puede hacer `.from()` sobre
`private`. En vez de exponer `private` a la API (y depender de configuración manual),
se añadieron funciones `security definer` en `public`
(`upsert_google_calendar_tokens`, `get_google_calendar_tokens`,
`update_google_access_token`, `disconnect_google_calendar`) con `EXECUTE` revocado a
`anon`/`authenticated` y concedido sólo a `service_role`. El servidor las llama vía
`admin.rpc(...)`. Validado contra Postgres 16: las tres migraciones aplican en orden
y `authenticated` sigue recibiendo "permission denied for schema private".

**Cifrado.** AES-256-GCM (`src/lib/security/crypto.ts`). Formato `base64(iv|tag|ct)`.
La función acepta la clave por parámetro (por defecto `GOOGLE_TOKEN_ENCRYPTION_KEY`),
lo que permite probar cifrado sin depender de todo el entorno de servidor. Pruebas:
ida y vuelta, IV distinto por cifrado, detección de manipulación, clave inválida.

**Sincronización.** `toGoogleEvent` fija siempre `reminders: { useDefault: false,
overrides: [] }` (spec §20), verificado por prueba. `resolveConflict` (estrategia
`latest` por defecto, empate → local) e `isTokenExpired` (con margen/skew) son puras
y probadas. Las llamadas de red (OAuth, insert/delete) están aisladas y se verifican
al conectar credenciales reales.

**Refresco de token.** `getValidGoogleAccess` descifra el access token; si venció,
usa el refresh token para pedir uno nuevo, lo re-cifra y lo guarda vía RPC.

---

## v0.5.0 — Asistente

**Decisión: orquestador con inyección de dependencias.** El bucle de tool-calling
(`src/lib/ai/orchestrator.ts`) recibe un `LlmClient`, lo que permite probar la lógica
(ejecutar herramienta de lectura, diferir acción destructiva a confirmación, manejar
argumentos inválidos) con un LLM falso, sin llamar a OpenAI.

**Seguridad de herramientas.** El `user_id` se resuelve de la sesión y se ignora
cualquiera que venga del modelo. Los argumentos se validan con Zod. Las acciones de
riesgo `required` (borrados) no se ejecutan en el bucle: se persisten como
`assistant_actions` pendientes y requieren confirmación explícita en `/api/assistant/actions`.

**Bug corregido (typecheck).** El formulario usaba `preview.hourlyCents`, pero el
tipo `DeliveryMetrics` expone `hourlyRateCents`. `tsc --noEmit` lo detectó antes del
build. Lección: el typecheck estricto es parte del pipeline, no opcional.

**Capa OpenAI.** `src/lib/ai/openai.ts` implementa `LlmClient` sobre la Responses API
(function tools con `function_call` / `function_call_output`). Aislada a propósito:
si el formato del wire cambia, sólo se toca este archivo.

---

## v0.4.0 — PWA

**Cola offline agnóstica del almacenamiento.** `QueueStore` es una interfaz; el
navegador usa IndexedDB y las pruebas un store en memoria. Así se prueba la
orquestación (`flushQueue`: 2xx elimina, 4xx descarta, 401 conserva, error de red
reintenta hasta el máximo) sin `fake-indexeddb`. La idempotencia real la da
`dedupeKey` (índice único por usuario); el servidor trata la violación única como
éxito.

**Bug corregido (routing).** El `matcher` del middleware no excluía `sw.js` ni
`offline.html`, así que sus peticiones se redirigían a `/login` y el service worker
no cargaba. Se ampliaron las exclusiones del matcher.

**Actualización controlada.** El SW versiona la caché (`CACHE_VERSION`); al cambiarla,
el nuevo worker queda "waiting" y la UI muestra "Nueva versión"; al confirmar se
envía `SKIP_WAITING` y se recarga en `controllerchange`. Registro sólo en producción.

---

## v0.3.0 — Metas y reportes

**Progreso por ritmo.** `computeGoalProgress` distingue metas de alcanzar (`min`) y de
techo (`max`, p. ej. gastos/millas). El estado (`en_camino`/`atrasado`) compara el
avance con la fracción de periodo transcurrida. Todo puro y probado, incluidos casos
límite (objetivo 0, valores negativos).

**Reportes.** `percentChange` devuelve `null` cuando el valor previo es 0 (cambio
indefinido) en lugar de dividir por cero. Gráfico de barras en SVG propio, sin
dependencias.

---

## v0.2.0 — Delivery

**Cálculos en la BD vs. dominio.** Columnas aditivas (`gross_income`, `net_income`,
`total_expenses`, `total_miles`) son `GENERATED ... STORED` a partir de columnas base
(no de otras generadas, que Postgres no permite). Las tasas por hora/milla se calculan
en la capa de dominio con guarda de división por cero, y se prueban.

**Idempotencia y auditoría.** La API resuelve el usuario de la sesión, valida con Zod,
inserta bajo RLS, deduplica por `dedupe_key` y registra en `audit_logs` con el
`service_role`.

---

## v0.1.0 — Fundaciones

**Base de datos.** ~20 tablas con RLS (`user_id = auth.uid()`). Dinero en `numeric`,
tiempos en `timestamptz`; la semana-desde-domingo y DST se resuelven en el dominio.
Validado contra Postgres 16: RLS aísla usuarios y los tokens quedan inaccesibles.

**Bug corregido (seed).** El `seed.sql` definía una función dentro del `DECLARE` de un
bloque `DO`, lo cual PL/pgSQL no permite; se reemplazó por una función `pg_temp`.

**Seguridad de tokens — evolución.** Primer intento: `REVOKE` por columna. Se demostró
frágil (un `GRANT` amplio posterior la deshace). Se movió a un esquema `private` sin
`USAGE` para los roles del cliente (base de lo que en v0.6 se completa con RPCs).

**Bug corregido (pruebas).** Vitest no resolvía el alias `@/`; se añadió
`resolve.alias` en `vitest.config.ts`.
