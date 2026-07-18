# Recordatorios push — guía de configuración

Todo funciona con Vercel + Supabase, sin servicios externos ni pagos.
Sigue estos 4 pasos.

## Paso 1 — Crear las tablas en Supabase

Ejecuta `push_notifications.sql` en el SQL Editor de Supabase. Crea las tablas
`push_subscriptions` y `notification_prefs` con su seguridad (RLS).

## Paso 2 — Variables de entorno en Vercel

Ve a Vercel → tu proyecto → Settings → Environment Variables y agrega estas 4:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIjj2PHpENcgPz9regWO92AoEvWgUZIrlQIjYXcjWpDw7MNNPwquXXHFdsn0MPMWXsRrZmgvzPHg3-qN3x-j4D8
VAPID_PRIVATE_KEY=BpqrM9TUORwyPkvBJqytQm7W88310T7yB3mxN4F7TVg
CRON_SECRET=<inventa-una-clave-larga-y-aleatoria>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key-de-supabase>
```

- Las llaves VAPID de arriba ya están generadas para ti. Cópialas tal cual.
- **CRON_SECRET**: inventa una contraseña larga (ej. un texto aleatorio de 40+
  caracteres). Protege el endpoint del cron.
- **SUPABASE_SERVICE_ROLE_KEY**: está en Supabase → Settings → API → "service_role"
  (la llave secreta). El cron la necesita para leer las preferencias de TODOS los
  usuarios y enviarles recordatorios. **Solo se usa en el servidor del cron, nunca
  se expone al navegador.**

## Paso 3 — Activar el Cron en Vercel

El archivo `vercel.json` ya está configurado para correr cada hora. Cuando hagas
deploy, Vercel detecta el cron automáticamente. Puedes verlo en:
Vercel → tu proyecto → Settings → Cron Jobs.

(El cron corre cada hora en punto y envía recordatorios a los usuarios cuya hora
local coincida con la hora que eligieron.)

## Paso 4 — Redeploy

Sube el nuevo `gymtrack-pro.zip` y haz redeploy. Listo.

---

## Cómo funciona

- El usuario activa los recordatorios en Settings → Notifications.
- El navegador se suscribe y se guarda en `push_subscriptions`.
- Cada hora, el cron revisa quién debe recibir un recordatorio según su hora local
  y su actividad, y envía UNO solo (el más relevante) para no ser molesto:
  - **Racha en peligro**: entrenó ayer pero no hoy.
  - **Inactividad**: lleva 3+ días sin entrenar.
  - **Diario de entrenar**: recordatorio normal del día.
  - **Nutrición**: si no ha registrado comidas hoy.

## Notas importantes

- **iPhone**: los push web solo funcionan si el usuario **instala la PWA** (Añadir
  a pantalla de inicio). En Safari normal no llegan. Android y escritorio funcionan
  sin instalar.
- Las suscripciones muertas (usuarios que desinstalaron) se limpian solas.
- Todo es gratis dentro de tu plan actual de Vercel + Supabase.
