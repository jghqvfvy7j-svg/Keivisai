# Validación de integraciones (staging)

Estas pruebas requieren credenciales reales y un despliegue de staging; no se pueden
ejecutar en CI sin secretos. Marca cada una al validarla.

## Base de datos / autorización
- [ ] Aplicar migraciones 0001–0005 en el Supabase de staging.
- [ ] Ejecutar la suite RLS: `DATABASE_URL=... npm run test:rls` → "TODAS LAS PRUEBAS RLS PASARON".
- [ ] `npm run test:e2e` (Playwright) contra staging: 401 en `/api/assistant/respond` y
      `/api/mcp` sin credenciales; páginas protegidas redirigen a `/login`.
- [ ] Aislamiento multiusuario: con `E2E_USER_A_*`/`E2E_USER_B_*`, B no accede a la
      conversación de A (403).

## OpenAI (asistente y visión)
- [ ] Con `OPENAI_API_KEY`, enviar "¿cuánto gané esta semana?" → responde y usa `get_week_delivery_summary`.
- [ ] "Registra 3 horas, 87.35 y 54 millas hoy" → crea la sesión (herramienta) y aparece en Delivery.
- [ ] Pedir borrar un evento → aparece tarjeta de confirmación (no se ejecuta sin confirmar).
- [ ] Importar horario por foto → extrae, muestra vista previa; sólo guarda al confirmar.

## Google Calendar
- [ ] Ajustes → Conectar: completa OAuth y vuelve conectado.
- [ ] "Sincronizar ahora": los eventos aparecen en Google **sin recordatorios**.
- [ ] Desconectar borra los tokens (verificar en BD que quedan nulos y estado 'revocado').

## Gmail
- [ ] Ajustes → Conectar Gmail (solo lectura).
- [ ] "Revisar correos": clasifica y muestra importantes en `/correos`; indicador en el dashboard.
- [ ] Marcar importante/no importante ajusta el resultado en el siguiente sync.

## MCP (ChatGPT)
- [ ] Generar token en Ajustes; `curl` a `/api/mcp` con `Authorization: Bearer` → `tools/list` responde.
- [ ] Sin token o token revocado → 401.
- [ ] Conectar en ChatGPT (Developer Mode) y ejecutar una herramienta de lectura.

## PWA en iPhone
- [ ] Instalar desde Safari; abre en modo standalone.
- [ ] Registrar delivery sin conexión → se guarda y sincroniza al reconectar.
- [ ] Publicar una versión nueva (subir `CACHE_VERSION`) → aparece "Nueva versión".
