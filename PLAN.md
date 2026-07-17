# Keivis Assistant — Plan técnico, revisión y arquitectura

> Documento de Fase 0. Combina la **revisión del prompt maestro** y la **planificación técnica** que pide la sección 40. Léelo antes de seguir construyendo.

---

## 1. Veredicto de la revisión

El prompt maestro es sólido y está bien estructurado. El modelo de datos, la postura de seguridad (RLS, resolver `user_id` desde la sesión, auditoría, confirmaciones por riesgo) y el enfoque por fases son correctos. No hay que reescribirlo; hay que **resolver unas decisiones y añadir unas piezas que faltan** antes de que el código crezca.

### Mejoras que ya incorporo al diseño

1. **Dinero en `numeric`, nunca `float`.** Todos los importes son `numeric(12,2)` y las millas `numeric(10,2)`. Evita errores de redondeo en cálculos financieros.
2. **Tabla `idempotency_keys` (faltaba).** El prompt exige idempotency keys pero no define dónde guardarlas. Añadida.
3. **`dedupe_key` para sincronización offline.** `calendar_events`, `delivery_sessions` y `workout_sessions` llevan una clave de de-duplicación única por usuario. Es lo que evita registros duplicados cuando vuelve el internet (sección 25).
4. **Columnas calculadas seguras en la BD.** `gross_income`, `total_expenses`, `net_income` y `total_miles` son columnas `GENERATED ... STORED` a partir de columnas base. Los *ratios* (por hora / por milla) se calculan en la capa de dominio con guarda de división por cero, para no romper el DDL y poder probar el caso "división por cero" que pide la sección 35.
5. **Protección a nivel de columna para tokens.** Los tokens cifrados de Google/Gmail tienen `REVOKE SELECT` para el rol `authenticated`: ni con RLS abierta el cliente puede leerlos. Solo el `service_role` (servidor) los toca.
6. **Tablas de servidor de solo-lectura para el cliente.** Auditoría, acciones del asistente, integraciones y resúmenes de correo: el cliente solo puede `SELECT` lo suyo; las escrituras pasan por el servidor con `service_role`.
7. **Trigger `handle_new_user`.** Al crearse un usuario en `auth.users` se crean automáticamente su `profile` y sus `user_preferences` con los valores por defecto de Keivis.

---

## 2. Contradicciones y decisiones resueltas

| Tema | Tensión en el prompt | Decisión |
|---|---|---|
| Estructura del repo | Pide monorepo "si mejora el mantenimiento" pero también un servidor MCP separado desde el diseño | **v1 = una sola app Next.js** con módulos internos limpios (`lib/domain`, `lib/ai`, `lib/integrations`, `lib/security`). El MCP se extrae en Fase 10 reutilizando `lib/domain`. Menos configuración, iteración más rápida, misma seguridad. Reversible. |
| Notificaciones | "Sin alarmas por defecto" pero módulo de correos "importantes" | No se emite ninguna notificación. Los correos importantes se muestran como **indicador discreto** en el dashboard ("3 correos importantes pendientes"), nunca como push. |
| "Sin dependencias innecesarias" vs. lista de librerías | — | Las librerías listadas (Zod, RHF, TanStack Query, date-fns-tz, recharts) son necesarias y se quedan. Nada más se añade sin justificar. |
| Cálculos en BD vs. app | Campos calculados listados como columnas | Aditivos → columna generada. Ratios con división → capa de dominio con `NULLIF`/guarda. |

---

## 3. Supuestos (confírmalos o corrígelos)

1. Un solo usuario real (Keivis) en v1; arquitectura multiusuario lista vía RLS, sin complejidad SaaS.
2. Zona horaria de negocio fija: `America/New_York`. La BD guarda `timestamptz` (UTC); la presentación y el "inicio de semana en domingo" se resuelven en dominio.
3. Moneda única: USD.
4. Plataforma de delivery principal: DoorDash; el campo `platform` permite otras después.
5. El asistente interno usa la **OpenAI Responses API** con tool calling; el modelo nunca toca Supabase directo, solo herramientas con esquema.
6. Despliegue en Vercel + Supabase gestionado.
7. Almacenamiento de fotos de horario en Supabase Storage, privado, borrable.

---

## 4. Arquitectura final (v1)

```
Next.js (App Router, TS estricto)  ──►  Route Handlers /api/*  ──►  lib/domain (lógica pura + Zod)
        │  React Server/Client                     │                         │
        │  Tailwind + tokens CSS                    ├── lib/ai (OpenAI, tools)
        │  PWA (manifest + SW)                      ├── lib/integrations (Google, Gmail)
        │                                           ├── lib/security (authz, cifrado, rate limit, audit)
        ▼                                           ▼
   Supabase JS (anon, RLS)                   Supabase (service_role, SOLO servidor)
                                                    │
                                             Postgres + RLS + Storage + Edge/Cron
```

Reglas duras: `SERVICE_ROLE_KEY` y `OPENAI_API_KEY` **solo en servidor**. El navegador usa la `anon key` y queda contenido por RLS. Toda escritura sensible pasa por un Route Handler que valida sesión, valida con Zod, autoriza, aplica idempotencia y registra auditoría.

---

## 5. Árbol del repositorio (v1)

```
keivis-assistant/
├── app/                      # Next.js App Router (páginas + /api)
│   ├── (app)/                # shell protegido: inicio, calendario, delivery, metas, asistente
│   ├── (auth)/               # login, registro, recuperar
│   └── api/                  # route handlers seguros
├── lib/
│   ├── domain/               # cálculos puros (dinero, tasas, semana, DST) + tests
│   ├── ai/                   # cliente OpenAI, definición de herramientas, recuperación de contexto
│   ├── integrations/         # google-calendar, gmail, cifrado de tokens
│   ├── security/             # authz, rate limit, idempotencia, audit, prompt-injection guards
│   ├── validation/           # esquemas Zod compartidos
│   └── supabase/             # clientes (browser anon / server service-role)
├── components/               # UI (app-shell, bottom-nav, cards, forms, calendar)
├── supabase/
│   ├── migrations/           # 0001_init.sql, 0002_rls.sql, ...
│   ├── seed.sql
│   └── tests/                # pruebas RLS
├── public/                   # manifest, iconos, offline.html
├── tests/                    # unit / integración / e2e (Playwright)
├── .env.example
└── README / ARCHITECTURE / SECURITY / PRIVACY / DEPLOYMENT
```

Evolución a monorepo (`apps/web` + `apps/mcp-server` + `packages/*`) solo en Fase 10, extrayendo `lib/domain` y `lib/validation` a `packages/`.

---

## 6. Decisiones de seguridad

- **RLS en todas las tablas.** Patrón `user_id = auth.uid()` (y `id = auth.uid()` en `profiles`).
- **Tablas de solo-lectura para cliente:** auditoría, acciones del asistente, mensajes, integraciones, resúmenes de correo, `goal_progress`, `automation_runs`, `idempotency_keys`. Escritura solo `service_role`.
- **Tokens OAuth cifrados** con `GOOGLE_TOKEN_ENCRYPTION_KEY` (AES-256-GCM en `lib/security`). Columnas de token con `REVOKE SELECT` para `authenticated`.
- **El modelo nunca recibe `user_id`.** Las herramientas resuelven el usuario desde la sesión e ignoran cualquier `user_id` que venga del modelo.
- **Datos no confiables:** correos y fotos se tratan como datos, nunca como instrucciones. Guardas anti prompt-injection en `lib/security`.
- **Confirmaciones por riesgo** (secciones 19/28): lectura sin confirmar; importaciones/sincronización con confirmación recomendada; borrados y cambios financieros con confirmación obligatoria y opción de deshacer vía `assistant_actions`.

---

## 7. Credenciales externas necesarias (checklist)

| Servicio | Qué necesitas | Notas verificadas (jul 2026) |
|---|---|---|
| Supabase | URL, anon key, service_role key, JWT secret | — |
| OpenAI | API key; modelos default/fast/vision | Responses API + tool calling. Correr solo en servidor. |
| Google OAuth | Client ID/Secret, redirect URI, clave de cifrado de tokens | Consentimiento y scopes mínimos. |
| Gmail (scopes restringidos) | Verificación de Google (CASA) para producción | En modo *testing* funciona para 1 usuario, con límites de usuarios de prueba y caducidad de token. Suficiente para v1 privado. |
| ChatGPT ↔ MCP (Fase 10) | Plan de pago + **Developer Mode** (beta) | Solo web; servidor MCP remoto por **HTTPS + OAuth**; OpenAI renombró "connectors" a "apps" (dic 2025). Admite acciones de escritura con confirmación. La app **no depende** de esto para funcionar. |

---

## 8. Hoja de ruta por fases

- **Fase 0 (este entregable):** plan + esquema SQL + RLS + seed + `.env.example` + validación de entorno. ✅
- **Fase 1:** app Next.js, auth, `lib/domain` con cálculos y pruebas (por hora, por milla, neto, división por cero, semana desde domingo, DST), dashboard "Hoy" + resumen semanal, navegación inferior.
- **Fase 2:** módulo DoorDash (registro rápido, sesiones, gastos, estadísticas). ✅
- **Fase 3:** metas + progreso + gráficos + comparaciones. ✅
- **Fase 4:** PWA (manifest, service worker, offline, cola de sincronización, instalación iPhone). ✅
- **Fase 5:** asistente OpenAI (chat, streaming, herramientas, confirmaciones, auditoría).
- **Fase 6:** Google Calendar (OAuth, sync sin recordatorios, conflictos).
- **Fase 7:** importación de horario por foto (visión, preview, confirmación).
- **Fase 8:** Gmail (lectura mínima, clasificación, correos importantes).
- **Fase 9:** automatizaciones + centro de actividad. ✅
- **Fase 10:** servidor MCP para ChatGPT. ✅
- **Fase 11:** endurecimiento (seguridad, e2e, accesibilidad, observabilidad).

---

## 9. Decisiones abiertas que requieren tu confirmación

1. **Nombre del proyecto:** propongo `keivis-assistant` como slug interno. ¿Lo dejamos o prefieres `myweek-ai` / `daypilot-personal`?
2. **Repo simple ahora, monorepo en Fase 10.** ¿De acuerdo, o quieres monorepo desde el día 1?
3. **Meta de ingreso semanal:** el prompt la deja "configurable". ¿Valor inicial sugerido para el seed y las metas?

Si no dices lo contrario, avanzo con: slug `keivis-assistant`, repo simple, y meta semanal como placeholder editable.
