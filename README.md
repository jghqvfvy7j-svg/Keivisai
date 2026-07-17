# Keivis Assistant

PWA privada de productividad, calendario, gimnasio e ingresos de delivery para iPhone.
Next.js (App Router) + Supabase. Español, zona horaria `America/New_York`, semana desde domingo.

> Estado: **Fases 0–11 implementadas y probadas (roadmap completo).** La fase 11 (endurecimiento) está planificada
> en `PLAN.md`. Ninguna integración externa se afirma funcional hasta configurarse y probarse.

## Qué incluye ya

- **Base de datos completa** (`supabase/migrations/`): esquema, RLS en todas las tablas,
  tokens OAuth aislados en un esquema `private` inaccesible desde el navegador, seed de
  ejemplo (semana desde domingo con martes y viernes libres). Probado contra Postgres 16.
- **Capa de dominio** (`src/lib/domain/`): cálculos de dinero en centavos, tasas por hora y
  por milla con guarda de división por cero, semana desde domingo y duraciones correctas a
  través de cambios de horario (DST). **107 pruebas** con Vitest, más e2e con Playwright.
- **Módulo DoorDash (Fase 2)**: formulario rápido con vista previa en vivo de $/hora y
  $/milla, API con validación Zod + auditoría, estadísticas semanales (mejor día, mejor
  zona, promedios) y lista de sesiones.
- **Metas y reportes (Fase 3)**: crear/eliminar metas (ganancias, horas, millas, sesiones,
  entrenamientos, promedios, gastos/millas como techo), barra de progreso con estado
  (en camino / atrasado / completado / excedido) calculado por ritmo, y reporte semanal
  con comparación vs. la semana anterior y gráfico diario (SVG, sin dependencias).
- **PWA (Fase 4)**: service worker con caché del shell y página offline, actualización
  controlada con banner "nueva versión", **cola de sincronización offline** en IndexedDB
  (los registros de delivery se guardan sin conexión y se envían al reconectar, con
  idempotencia por `dedupeKey`), banner de sin conexión y pantalla "Instalar en iPhone".
- **Asistente OpenAI (Fase 5)**: chat en español con herramientas de esquema estricto
  (registrar delivery, consultar semana, crear metas/eventos, borrar con confirmación).
  El `user_id` se resuelve de la sesión, nunca del modelo; las acciones destructivas
  requieren confirmación explícita; todo queda auditado. El orquestador del bucle de
  tool-calling se prueba con un LLM falso (sin llamar a OpenAI). La llamada real usa la
  Responses API y necesita `OPENAI_API_KEY`; verifica la forma del wire contra tu cuenta.
- **Google Calendar (Fase 6)**: OAuth desde Ajustes, tokens cifrados (AES-256-GCM)
  aislados en un esquema `private` accedido por RPC security definer, sincronización
  de eventos sin recordatorios, y lógica de conflictos/expiración de token probada.
- **Importar horario por foto (Fase 7)**: extracción con modelo de visión (aislada),
  conversión de códigos AM/PM/OFF a horarios (pura y probada) y vista previa editable;
  no se guarda nada sin confirmar y la imagen no se almacena.
- **Gmail (Fase 8)**: OAuth de solo lectura (callback compartido por `state`), tokens
  cifrados en `private` vía RPC, clasificación pura con aprendizaje por feedback, e
  indicador discreto de correos importantes en el dashboard. Sin notificaciones.
- **Automatizaciones (Fase 9)**: detección de sesiones incompletas, duplicados y
  conflictos (puro y probado), recomendación de bloque de DoorDash, recálculo de metas,
  centro de actividad y cron horario protegido por `CRON_SECRET`. Sin notificaciones.
- **Servidor MCP (Fase 10)**: endpoint JSON-RPC en `/api/mcp` que expone al ChatGPT
  las herramientas seguras (lectura y registro), con tokens revocables hasheados y
  auditoría. Dispatcher probado con DI. Guía en `docs/MCP.md`. La app funciona sin MCP.
- **Endurecimiento (Fase 11)**: rate limiting por usuario en rutas sensibles, cabeceras
  de seguridad (HSTS, X-Frame-Options, etc.), logger estructurado, accesibilidad
  (saltar al contenido, foco visible) y pruebas e2e con Playwright.
- **App Next.js**: auth (email/contraseña) con `@supabase/ssr`, middleware que protege rutas,
  shell móvil con navegación inferior, dashboard "Hoy" + resumen semanal leídos de Supabase,
  tokens de color por categoría, base de PWA (manifest, safe-areas, sin zoom en inputs).

## Requisitos

- Node.js 18.18+ (probado con 22).
- Un proyecto de Supabase.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellena los valores
```

Aplica las migraciones y el seed en tu proyecto Supabase (CLI o el editor SQL):

```bash
# con Supabase CLI
supabase db push
# luego edita supabase/seed.sql (pon tu UUID de auth.users) y ejecútalo
```

Arranca:

```bash
npm run dev        # desarrollo
npm run test       # 21 pruebas de dominio
npm run typecheck  # tsc --noEmit
npm run build      # build de producción
```

## Variables de entorno

Ver `.env.example`. Solo las `NEXT_PUBLIC_*` llegan al navegador. `SUPABASE_SERVICE_ROLE_KEY`
y `OPENAI_API_KEY` son exclusivas de servidor. `GOOGLE_TOKEN_ENCRYPTION_KEY` debe ser 32 bytes
en base64 (`openssl rand -base64 32`). Todas se validan al arrancar en `src/env.ts`.

## Estructura

```
src/
  app/
    (auth)/login, (auth)/registro     # públicas
    (app)/inicio, calendario, ...      # protegidas (shell + bottom nav)
  components/                          # UI
  lib/
    domain/                            # cálculos puros + pruebas
    supabase/                          # clientes browser / server / admin(service_role)
    validation/                        # esquemas Zod
  env.ts                               # validación de entorno
supabase/
  migrations/ 0001_init.sql 0002_rls.sql
  seed.sql
```

## Seguridad (resumen)

- RLS en todas las tablas (`user_id = auth.uid()`). Probada: un usuario no ve datos de otro.
- Tokens OAuth cifrados en el esquema `private`, sin acceso desde los roles del cliente; el
  estado de conexión se expone sin tokens vía `public.get_integration_status()`.
- El `service_role` solo se usa en servidor. Ver `PLAN.md` y (pendiente) `SECURITY.md`.

## Despliegue

Vercel + Supabase. Configura las variables de entorno en Vercel. Ver `PLAN.md` §7 para el
checklist de credenciales (Supabase, OpenAI, Google OAuth, Gmail, y ChatGPT↔MCP en Fase 10).

## Documentación de versiones

`CHANGELOG.md` (producto), `RELEASE_NOTES.md` (funcional), `ENGINEERING_LOG.md`
(técnico) y `Versiones.md` (índice) se actualizan en cada versión.

## Roadmap

Fases detalladas en `PLAN.md`. Siguiente: **Fase 3** (metas y reportes con gráficos,
comparaciones semanales), reutilizando `src/lib/domain`.
