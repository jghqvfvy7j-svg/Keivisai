# Cómo sacar cada credencial (con la URL oficial)

Guía paso a paso para obtener cada llave y pegarla en las variables de entorno
(`.env.local` en tu máquina y en **Vercel → Project → Settings → Environment Variables**).
El nombre exacto de la variable va en `código`.

---

## 1. Supabase (base de datos + auth)

**Sitio:** https://supabase.com → inicia sesión → abre tu proyecto.

1. **Project URL** → menú **Settings (⚙) → Data API** (o el botón **Connect** arriba).
   Cópiala en `NEXT_PUBLIC_SUPABASE_URL` (formato `https://xxxx.supabase.co`).
2. **Claves API** → **Settings → API Keys**.
   - La **anon / publishable** (pública, para el navegador) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - La **service_role / secret** (¡SECRETA, sólo servidor!) → `SUPABASE_SERVICE_ROLE_KEY`.
   - Nota: Supabase está migrando de las llaves *legacy* (`anon`/`service_role`) a las nuevas
     (`publishable`/`secret`). Cualquiera de las dos sirve: usa la publishable como anon y la
     secret como service_role.
3. **JWT secret** → **Settings → API Keys → JWT Keys** (o "JWT Settings").
   Cópialo en `SUPABASE_JWT_SECRET`.

> La `service_role` puede leer/escribir saltándose RLS. Nunca la pongas en el cliente ni la
> subas a git; sólo en variables de entorno del servidor.

---

## 2. OpenAI (asistente y lectura de la foto del horario)

**Sitio:** https://platform.openai.com → inicia sesión.

1. Menú de tu perfil → **API keys** (o directamente https://platform.openai.com/api-keys).
2. **Create new secret key** → nómbrala (p. ej. "keivis") → **Create**.
3. Copia la llave (`sk-...`) **en ese momento** (no se vuelve a mostrar) → `OPENAI_API_KEY`.
4. Modelos (opcional, ya traen valores por defecto):
   `OPENAI_MODEL_DEFAULT`, `OPENAI_MODEL_FAST`, `OPENAI_MODEL_VISION`.
5. Necesitas saldo/billing activo en **Settings → Billing**.

---

## 3. Google Calendar + Gmail (un solo cliente OAuth)

**Sitio:** https://console.cloud.google.com → inicia sesión.

1. **Crea un proyecto** (selector de proyecto arriba → New Project).
2. **Habilita las APIs**: menú **APIs & Services → Library** → busca y habilita
   **Google Calendar API** y **Gmail API**.
3. **Pantalla de consentimiento**: **APIs & Services → OAuth consent screen** →
   tipo **External** → completa nombre y correos → en **Test users** añade tu propio correo
   (con Gmail en modo prueba te basta a ti; `gmail.readonly` es un scope restringido que en
   producción requiere verificación de Google).
4. **Crea las credenciales**: **APIs & Services → Credentials → Create Credentials →
   OAuth client ID** → tipo **Web application**.
   - **Authorized redirect URIs** → agrega exactamente:
     `https://TU-DOMINIO/api/google/callback`
     (para desarrollo local, además `http://localhost:3000/api/google/callback`).
   - Crea y copia:
     - **Client ID** → `GOOGLE_CLIENT_ID`
     - **Client secret** → `GOOGLE_CLIENT_SECRET`
   - La misma URL de redirect va en `GOOGLE_REDIRECT_URI`
     (`https://TU-DOMINIO/api/google/callback`). Calendar y Gmail comparten este cliente y
     este callback; el flujo se distingue internamente por el `state`.

---

## 4. Llaves que generas tú (no salen de ningún sitio web)

En una terminal:

```bash
# Clave para cifrar los tokens de Google/Gmail (AES-256-GCM)
openssl rand -base64 32      # -> GOOGLE_TOKEN_ENCRYPTION_KEY

# Secretos internos
openssl rand -hex 32         # -> CRON_SECRET
openssl rand -hex 32         # -> INTERNAL_API_SECRET
```

- `CRON_SECRET`: protege `/api/cron/run`. En Vercel, al definir esta variable, el Cron añade
  solo `Authorization: Bearer <CRON_SECRET>` automáticamente.
- `NEXT_PUBLIC_APP_URL`: la URL pública de tu app (`https://TU-DOMINIO`).
- `LOG_LEVEL` (opcional): `info` por defecto. `SENTRY_DSN` (opcional): si usas Sentry.

---

## 5. Conector de ChatGPT (MCP) — no es una variable

No se configura con `.env`. Una vez desplegada la app:

1. Entra a la app → **Ajustes → Conector ChatGPT (MCP)** → **Generar** un token (se muestra
   una vez) y copia la **URL del servidor** (`https://TU-DOMINIO/api/mcp`).
2. En **chatgpt.com** (navegador) → **Settings → Apps & Connectors → Advanced settings →
   Developer Mode** → crea un conector con esa URL y `Authorization: Bearer <token>`.
3. Puedes **revocar** el token cuando quieras desde Ajustes. Detalles en `docs/MCP.md`.

> Ojo: **no** es la pantalla "Remote control / Pair a new device / SSH" de la app **Codex**
> (eso es para ejecutar código en una máquina remota). El MCP va en los ajustes de ChatGPT.

---

## Resumen de variables

| Variable | De dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → Data API / Connect |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API Keys (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API Keys (service_role/secret) |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API Keys → JWT Keys |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud → Credentials → OAuth client |
| `GOOGLE_REDIRECT_URI` | `https://TU-DOMINIO/api/google/callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `CRON_SECRET` / `INTERNAL_API_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | tu dominio público |

Orden sugerido: **Supabase → migraciones → variables en Vercel → desplegar → OpenAI →
Google → probar en iPhone → MCP**. Ver `DEPLOYMENT.md`.
