# Checklist de auditoría pre-deploy

Estado global: **0.11.0-rc.1** (release candidate). No promover a **1.0.0** hasta
completar todo lo siguiente y superar validación en staging.

## P0 — Seguridad crítica
- [x] **Autorización de conversaciones** en `/api/assistant/respond` (IDOR corregido:
      verifica `id + user_id` antes de usar `service_role`; historial filtrado por usuario).
- [x] Barrido de rutas con `service_role`: sin otros IDOR (ver ENGINEERING_LOG).

## P1 — Endurecimiento y build reproducible (pendiente)
- [x] Actualizar dependencias y fijar versiones; `npm audit` **sin altas/críticas** (Next 15.5.20, Vitest 4).
- [x] Build reproducible: `.nvmrc` (22), `engines.node>=20.11`, lockfile, `npm ci` limpio.
- [x] CSP añadida (estricta en producción). Pendiente migrar `script-src` a nonce.
- [x] Verificado: ningún secreto llega al bundle del cliente.

> Nota P1: quedan 2 moderadas por el `postcss` interno de Next (build-time, no
> explotable en runtime); se cierra al actualizar Next.

## P2 — Pruebas de endpoints e integraciones (pendiente)
- [x] Contratos de validación (Zod) de endpoints en Vitest; e2e de authz (401 API/MCP, redirect).
- [~] Guía y checklist en `docs/INTEGRATION_VALIDATION.md` (requiere staging + credenciales).
- [x] Autorización multiusuario a nivel BD (`supabase/tests/rls.sql`, incl. regresión IDOR) — pasa. E2E multiusuario listo para staging.

> Hallazgos P2 (corregidos): build acoplado a env (rompía Vercel) y middleware que
> redirigía `/api` a `/login` (rompía MCP y cron). Ver ENGINEERING_LOG.

## P3 — PWA y plataforma (pendiente)
- [ ] Revisar manifest, iconos reales (192/512/maskable) y splash en iPhone.
- [ ] Verificar service worker, offline y actualización en dispositivo real.

## P4 — Staging y despliegue (pendiente)
- [ ] Proyecto Supabase de staging + migraciones aplicadas en orden.
- [ ] Variables de entorno en Vercel; `GOOGLE_REDIRECT_URI` de staging registrado.
- [ ] Cron verificado en Vercel.
- [ ] Ejecutar Playwright e2e contra staging.

## Criterio de cierre
Todos los ítems marcados, `npm run test` + `typecheck` + `build` verdes, e2e en verde y
una pasada manual en iPhone. Sólo entonces se etiqueta **1.0.0**.
