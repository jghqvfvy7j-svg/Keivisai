# Changelog

Formato basado en *Keep a Changelog*. Fechas en zona America/New_York.
Versionado por fase del proyecto (ver `Versiones.md`).

## [0.11.0-rc.4] — Rediseño UX profesional + guía de credenciales
### Cambiado (Diseño)
- Nuevo sistema de diseño sobrio: paleta neutra desaturada, tipografía nativa de iPhone,
  números tabulares (aire de panel financiero), tarjetas con borde hairline y clases
  reutilizables (`.card/.btn/.input/.eyebrow/.metric/.tag`).
- **Íconos SVG de línea** en vez de emojis en toda la app (nav, tarjetas, indicadores).
  Barra de navegación con estado activo en tinta e indicador superior.
- Botón primario en tinta (near-black); indigo reservado a enlaces/estado activo/foco;
  verde sólo para dinero positivo. Pantallas de acceso rediseñadas.
### Añadido
- `docs/CREDENCIALES.md`: guía paso a paso para obtener cada llave y URL oficial
  (Supabase, OpenAI, Google Calendar/Gmail, secretos generados, MCP).

## [0.11.0-rc.3] — Auditoría pre-deploy (P2)
### Corregido (Bloqueadores de despliegue)
- **Build en Vercel fallaba**: la validación de `NEXT_PUBLIC_*` lanzaba al importar el
  módulo, y Next 15 importa las rutas al recolectar datos → el build moría sin variables.
  Ahora `clientEnv` no lanza en build (cae a valores crudos); la validación estricta del
  servidor sigue en runtime.
- **Middleware redirigía `/api` a `/login`**: rompía `/api/mcp` (auth por token) y
  `/api/cron/run` (auth por secreto), y hacía que las APIs devolvieran HTML en vez de 401.
  Se excluyó `/api` del middleware; cada ruta gestiona su propia autenticación.
### Añadido (Pruebas)
- Suite SQL de **autorización multiusuario** (`supabase/tests/rls.sql`) con **regresión del
  IDOR**: aislamiento de lectura, bloqueo de insert/update/delete cruzado, `private` y
  `mcp_tokens` denegados. Ejecutada contra Postgres: todo pasa.
- Pruebas de **contrato** de los esquemas Zod de los endpoints (Vitest, 10).
- Pruebas e2e de autorización (401 en API/MCP, redirección de páginas) listas para staging.
- `docs/INTEGRATION_VALIDATION.md` y script `test:rls`.

## [0.11.0-rc.2] — Auditoría pre-deploy (P1)
### Cambiado (Dependencias / build reproducible)
- Next 14.2.35 → **15.5.20** (corrige todas las vulnerabilidades altas/críticas de Next:
  cache poisoning en RSC, XSS con nonces de CSP, varias DoS). Código adaptado a las APIs
  asíncronas de Next 15 (`cookies()`, `params`).
- Vitest 2 → **4.1.10** (corrige la crítica de dev del servidor UI y las de vite/esbuild).
- Versiones directas **fijadas** (exactas), `engines.node >=20.11`, `.nvmrc` y `npm ci` limpio.
### Añadido (Seguridad)
- **Content-Security-Policy** (estricta en producción) además de HSTS/X-Frame-Options/etc.
- Verificado que ningún secreto llega al bundle del cliente.
### Notas
- `npm audit`: 0 altas/críticas. Quedan 2 moderadas por el `postcss` que Next fija
  internamente (dependencia de **build**, procesa sólo CSS propio → no explotable). Se
  resolverá cuando Next actualice su postcss; no se fuerza para no saltar a Next 16.

## [0.11.0-rc.1] — Auditoría pre-deploy
> Release candidate. Aún NO es 1.0.0: pendiente el checklist de `PREDEPLOY.md`.
### Corregido (Seguridad · P0)
- IDOR en `POST /api/assistant/respond`: un `conversationId` del cliente se usaba con
  `service_role` (que omite RLS) sin verificar propiedad, permitiendo escribir en y leer
  conversaciones ajenas. Ahora se verifica `id + user_id` antes de usarlo (403 si no) y el
  historial se filtra también por `user_id`.
### Auditado
- Barrido de todas las rutas con `service_role`: el resto ya acotaba por `user_id` o
  resolvía el usuario de la sesión/token. Sin otros IDOR.

## [0.11.0] — Fase 11 · Endurecimiento
### Añadido
- Rate limiting por usuario en rutas sensibles (asistente, MCP, Gmail, importar, cron manual).
- Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy).
- Logger estructurado con filtrado por nivel.
- Accesibilidad: enlace "saltar al contenido" y foco visible.
- Pruebas e2e con Playwright y documentación final (ARCHITECTURE, SECURITY, PRIVACY, DEPLOYMENT).
### Estado
- Se cumplen los criterios de aceptación del roadmap (Fases 0–11). Candidata a 1.0.0.

## [0.10.0] — Fase 10 · Servidor MCP (ChatGPT)
### Añadido
- Servidor MCP para conectar ChatGPT a la app (herramientas de lectura y registro).
- Tokens de acceso revocables (hasheados) gestionados desde Configuración.
- Las acciones destructivas no se exponen por MCP; cada llamada se valida y audita.
- Guía de conexión en `docs/MCP.md`. La app funciona sin MCP.

## [0.9.0] — Fase 9 · Automatizaciones y centro de actividad
### Añadido
- Procesos automáticos silenciosos: recálculo de metas, detección de sesiones
  incompletas, eventos duplicados y conflictos de horario.
- Recomendación de bloque de DoorDash (3 h tras el gimnasio/trabajo).
- **Centro de actividad** para ver automatizaciones y cambios recientes.
- Cron por hora (Vercel) protegido y botón "Ejecutar ahora". Sin notificaciones.

## [0.8.0] — Fase 8 · Gmail
### Añadido
- Conexión con Gmail (solo lectura) desde Configuración.
- Clasificación de correos importantes (seguridad, facturas, trabajo, promociones…).
- Indicador discreto en el dashboard: "N correos importantes pendientes" (sin notificaciones).
- Botones "importante"/"no importante" que afinan la clasificación (aprende del feedback).

## [0.7.0] — Fase 7 · Importar horario por foto
### Añadido
- Subir una foto del horario y extraer la fila de "Keivis" con un modelo de visión.
- **Vista previa editable**: revisas y quitas eventos; nada se guarda sin confirmar.
- Detección de días libres (OFF) y aviso de códigos/fechas no reconocidos.

## [0.6.0] — Fase 6 · Google Calendar
### Añadido
- Conexión con Google Calendar mediante OAuth desde **Configuración**.
- Sincronización de eventos hacia Google **sin recordatorios ni alarmas**.
- Cifrado de los tokens de Google (AES-256-GCM) aislados del navegador.
- Botón "Sincronizar ahora" y "Desconectar" en Ajustes.

## [0.5.0] — Fase 5 · Asistente
### Añadido
- Asistente de chat en español que entiende lenguaje natural.
- Puede registrar delivery, consultar la semana, crear metas y eventos.
- Las acciones destructivas (borrar) piden **confirmación** antes de ejecutarse.
- Historial de conversación persistente y registro de auditoría.

## [0.4.0] — Fase 4 · PWA
### Añadido
- Instalable en iPhone ("Agregar a pantalla de inicio"), pantalla guiada.
- Funciona sin conexión: los registros se guardan y se envían al reconectar.
- Aviso de "Nueva versión disponible" y banner de "sin conexión".

## [0.3.0] — Fase 3 · Metas y reportes
### Añadido
- Metas diarias, semanales y mensuales con barra de progreso y estado.
- Reporte semanal con comparación vs. la semana anterior y gráfico diario.

## [0.2.0] — Fase 2 · Delivery
### Añadido
- Registro rápido de sesiones de DoorDash con vista previa de $/hora y $/milla.
- Estadísticas semanales: mejor día, mejor zona, promedios; lista de sesiones.

## [0.1.0] — Fases 0–1 · Fundaciones
### Añadido
- Inicio de sesión, base de datos con seguridad por usuario, dashboard "Hoy" y
  resumen semanal, navegación inferior estilo app y cálculos base probados.
