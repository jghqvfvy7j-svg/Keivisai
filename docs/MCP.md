# Conectar ChatGPT mediante el servidor MCP

La app funciona por completo sin esto. El servidor MCP es una capa opcional para
que ChatGPT lea y registre datos en tu app usando las mismas herramientas seguras
que el asistente interno.

## Qué expone

Sólo herramientas **no destructivas** (spec §31):
- `get_today_schedule` — agenda de hoy.
- `get_week_delivery_summary` — resumen de delivery de la semana.
- `get_active_goals` — metas activas.
- `create_delivery_session` — registrar una sesión de delivery.
- `create_goal` — crear una meta.
- `create_calendar_event` — crear un evento (sin recordatorios).

Las acciones destructivas (borrar) **no** están disponibles por MCP. El `user_id`
se resuelve del token, nunca del modelo. Cada llamada se valida con Zod y se audita.

## Requisitos

- La app desplegada por **HTTPS** (Vercel).
- Un plan de ChatGPT con **Developer Mode / MCP** (Plus, Pro, Business, Enterprise
  o Edu; en beta y sólo en web al momento de escribir esto — verifícalo en OpenAI).

## Pasos

1. En la app, ve a **Ajustes → Conector ChatGPT (MCP)**.
2. Pon un nombre y pulsa **Generar**. Copia el token (se muestra una sola vez).
3. Anota la **URL del servidor**: `https://TU-DOMINIO/api/mcp`.
4. En ChatGPT, activa **Developer Mode** y añade un servidor MCP:
   - URL: la del paso 3.
   - Autenticación: cabecera `Authorization: Bearer <token>` (el token del paso 2).
5. Guarda. ChatGPT hará `initialize` y `tools/list`; deberías ver las herramientas.
6. Prueba: "¿cuánto gané esta semana?" o "registra 3 horas, 87.35 y 54 millas hoy".

## Protocolo

Endpoint JSON-RPC 2.0 sobre HTTP POST. Métodos: `initialize`, `tools/list`,
`tools/call`, `ping`. Requiere `Authorization: Bearer <token>` en cada solicitud.

Ejemplo (`tools/list`):

```bash
curl -s https://TU-DOMINIO/api/mcp \
  -H 'Authorization: Bearer mcp_xxx' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Seguridad

- Los tokens se guardan **hasheados** (SHA-256); el secreto sólo se muestra al crearlo.
- Puedes **revocar** un token en cualquier momento desde Ajustes.
- Sin token válido (revocado/expirado/ausente) el servidor responde 401.
- Nunca uses una clave fija compartida; genera un token por conexión.

> Nota: el wire de MCP y el flujo exacto de conexión en ChatGPT pueden cambiar.
> Este endpoint implementa el núcleo JSON-RPC (initialize/tools.list/tools.call);
> verifica el transporte contra la versión vigente de ChatGPT al conectar.
