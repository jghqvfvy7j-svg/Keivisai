# Seguridad

## Autenticación y autorización
- Supabase Auth (email/contraseña). Rutas protegidas por middleware.
- RLS estricta: cada fila pertenece a `user_id = auth.uid()`. Probado: un usuario no
  ve ni modifica datos de otro.
- El `user_id` SIEMPRE se resuelve de la sesión/token; nunca del modelo ni del cliente.

## Secretos y tokens
- `SUPABASE_SERVICE_ROLE_KEY` y `OPENAI_API_KEY` sólo en servidor.
- Tokens OAuth de Google/Gmail cifrados con AES-256-GCM (`GOOGLE_TOKEN_ENCRYPTION_KEY`),
  guardados en el esquema `private` (inaccesible desde el navegador).
- Tokens MCP: se guarda sólo el hash SHA-256; revocables desde Ajustes.

## Superficie de IA
- El asistente sólo actúa por herramientas con esquema Zod; nunca ejecuta SQL ni accede
  directo a la BD.
- Correos, fotos y textos externos se tratan como DATOS, no instrucciones (anti prompt-injection).
- Acciones destructivas requieren confirmación explícita y quedan auditadas.
- El MCP no expone acciones destructivas.

## Endurecimiento
- Rate limiting por usuario en rutas sensibles (asistente, MCP, Gmail, importar, automatizaciones).
- Cabeceras: **Content-Security-Policy** (estricta en producción), `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- Sin `X-Powered-By`. Cron protegido por `CRON_SECRET`.

## Notas
- El rate limiting en memoria es por instancia; en producción multi-instancia usar un
  store compartido (p. ej. Upstash Redis) con la misma API de `lib/security/rate-limit`.
- Gmail `gmail.readonly` es un scope restringido: requiere verificación de Google (CASA)
  para producción; en modo prueba funciona para un usuario.

## Dependencias
- Versiones directas fijadas; `engines.node >= 20.11`; `npm ci` reproducible.
- `npm audit`: 0 altas/críticas. Quedan 2 moderadas por el `postcss` que Next empaqueta
  internamente (dependencia de build que procesa sólo CSS propio; no explotable en
  runtime). Se resolverá al actualizar Next; no se fuerza para evitar el salto a Next 16.
- CSP: `script-src` aún usa `'unsafe-inline'` (hidratación de Next); migración a nonce
  pendiente (P1 follow-up).
