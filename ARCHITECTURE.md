# Arquitectura

## Resumen
PWA privada en **Next.js (App Router, TS estricto)** + **Supabase** (Postgres, Auth,
RLS, Storage). Zona de negocio `America/New_York`; la semana empieza el domingo.

## Capas
- `app/` — páginas (grupo `(auth)` público, `(app)` protegido) y route handlers `api/`.
- `lib/domain/` — lógica pura y probada (dinero, tasas, semana/DST, metas, stats).
- `lib/ai/` — herramientas del asistente, orquestador (DI), cliente OpenAI, visión.
- `lib/integrations/` — Google Calendar, Gmail, cifrado y refresco de tokens.
- `lib/security/` — cifrado AES-GCM, rate limiting.
- `lib/mcp/` — tokens y dispatcher del servidor MCP.
- `lib/automations/` — detectores y runner de tareas silenciosas.
- `lib/supabase/` — clientes browser (anon, RLS), server (anon+cookies) y admin (service_role).

## Datos y seguridad
- RLS en todas las tablas (`user_id = auth.uid()`).
- Tokens OAuth cifrados en el esquema **`private`** (no expuesto por PostgREST),
  accedidos por funciones **security definer** sólo ejecutables por `service_role`.
- Tablas de servidor (auditoría, acciones del asistente, `mcp_tokens`) sin acceso del cliente.
- Claves (`SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) sólo en servidor.

## Integraciones (opcionales)
OpenAI (asistente y visión), Google Calendar, Gmail (solo lectura) y servidor MCP para
ChatGPT. Cada una está aislada; la app funciona sin ellas.

## Principio de pruebas
Toda la lógica pura está cubierta con Vitest (107 pruebas). Las capas de red (OpenAI,
Google, Gmail, ChatGPT) están aisladas y se verifican al conectar credenciales reales.
