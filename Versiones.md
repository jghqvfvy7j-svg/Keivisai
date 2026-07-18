# Versiones

Una línea por versión/fase/ajuste. Detalle funcional en `RELEASE_NOTES.md` y técnico
en `ENGINEERING_LOG.md`.

| Versión | Fase | Fecha | Resumen |
|---|---|---|---|
| 0.11.0-rc.4 | Diseño/Docs | 2026-07-16 | Rediseño UX profesional (sin emojis, íconos SVG, paleta sobria, tipografía y números tabulares) + guía de credenciales. |
| 0.11.0-rc.3 | Pre-deploy | 2026-07-16 | P2: build ya no depende de env (fix Vercel), middleware no redirige /api (fix MCP/cron), suite RLS multiusuario + regresión IDOR, contratos Zod y e2e de authz. |
| 0.11.0-rc.2 | Pre-deploy | 2026-07-16 | P1: Next 15.5.20 + Vitest 4 (0 altas/críticas), versiones fijadas, npm ci reproducible, CSP y verificación de secretos. |
| 0.11.0-rc.1 | Pre-deploy | 2026-07-16 | Auditoría: corregido IDOR P0 en el asistente; barrido de rutas service_role sin otros hallazgos. |
| 0.11.0 | Fase 11 | 2026-07-16 | Endurecimiento: rate limiting, cabeceras, logger, accesibilidad, e2e y documentación final. Cumple criterios de aceptación. |
| 0.10.0 | Fase 10 | 2026-07-16 | Servidor MCP para ChatGPT: JSON-RPC, tokens revocables hasheados, sólo herramientas seguras, guía de conexión. |
| 0.9.0 | Fase 9 | 2026-07-16 | Automatizaciones silenciosas (detecciones + recálculo de metas), recomendación de bloque, centro de actividad y cron. |
| 0.8.0 | Fase 8 | 2026-07-16 | Gmail: solo lectura, clasificación con aprendizaje por feedback, indicador discreto sin notificaciones. |
| 0.7.0 | Fase 7 | 2026-07-16 | Importar horario por foto: extracción con visión, vista previa editable, sin guardar sin confirmar. |
| 0.6.0 | Fase 6 | 2026-07-16 | Google Calendar: OAuth, tokens cifrados en esquema `private` vía RPC, sync sin recordatorios, lógica de conflictos probada. |
| 0.5.0 | Fase 5 | 2026-07-16 | Asistente OpenAI: herramientas con esquema, orquestador con DI (probado sin OpenAI), confirmación de acciones, auditoría. |
| 0.4.0 | Fase 4 | 2026-07-16 | PWA: service worker, offline con cola en IndexedDB, actualización controlada, instalar en iPhone. |
| 0.3.0 | Fase 3 | 2026-07-16 | Metas con progreso por ritmo y reporte semanal con comparación y gráfico. |
| 0.2.0 | Fase 2 | 2026-07-16 | Delivery: registro rápido, estadísticas, mejor día/zona, API con auditoría. |
| 0.1.0 | Fases 0–1 | 2026-07-15 | Fundaciones: auth, BD con RLS, dashboard, dominio probado, PWA base. |

## Convención

- **MAYOR.MENOR.PARCHE**. Cada fase sube la **menor**. Un ajuste pequeño dentro de una
  fase sube el **parche** (p. ej. `0.6.1`) y se anota aquí en una fila nueva.
- Cada versión toca los cuatro documentos: `CHANGELOG.md` (producto),
  `RELEASE_NOTES.md` (funcional), `ENGINEERING_LOG.md` (técnico) y este archivo.
