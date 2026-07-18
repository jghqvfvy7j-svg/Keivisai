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

- La app desplegada por **HTTPS** (Vercel) y con sus variables de entorno configuradas
  (Supabase, etc.), y las migraciones aplicadas.
- Un plan de ChatGPT con **Developer Mode** (beta): Plus, Pro, Business o Enterprise/Edu.
  Se configura en **ChatGPT web** (chatgpt.com), no en la app del teléfono.

> **Esto NO es la pantalla "Remote control" de Codex.** En la app de Codex, "Pair a new
> device" y "SSH" sirven para que Codex ejecute código en una máquina remota; no tienen
> relación con este conector. El MCP se agrega en los ajustes de **ChatGPT**.

## Pasos

1. En tu app, ve a **Ajustes → Conector ChatGPT (MCP)**, pon un nombre y pulsa **Generar**.
   Copia el token (se muestra una sola vez) y anota la URL `https://TU-DOMINIO/api/mcp`.
2. En **chatgpt.com** (navegador) abre **Settings → Apps & Connectors**
   (antes "Connectors"; renombrado a "Apps" el 17-dic-2025).
3. Entra en **Advanced settings** y activa **Developer Mode**.
4. Crea un conector/app nuevo:
   - **URL**: `https://TU-DOMINIO/api/mcp`
   - **Autenticación**: `Authorization: Bearer <token>` (el del paso 1).
5. Guarda. ChatGPT hará `initialize` y `tools/list`; deberías ver las herramientas.
   En cada chat, habilita el conector desde el menú de Developer Mode.
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
