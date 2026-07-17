# Despliegue

## 1. Supabase
1. Crea un proyecto. Copia URL, anon key, service_role key y JWT secret.
2. Aplica migraciones en orden (`supabase db push` o el editor SQL):
   `0001_init` → `0002_rls` → `0003_google_tokens` → `0004_gmail_tokens` → `0005_mcp_tokens`.
3. (Opcional) Ejecuta `seed.sql` tras poner tu UUID de `auth.users`.

## 2. Variables de entorno (ver `.env.example`)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL_DEFAULT/FAST/VISION`.
- Google: `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI` (= `https://TU-DOMINIO/api/google/callback`),
  `GOOGLE_TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`).
- Infra: `CRON_SECRET`, `INTERNAL_API_SECRET`, `NEXT_PUBLIC_APP_URL`, `LOG_LEVEL`, `SENTRY_DSN`.

## 3. Google OAuth
- Habilita las APIs de Calendar y Gmail.
- Añade el redirect URI `https://TU-DOMINIO/api/google/callback` (lo usan Calendar y Gmail;
  el `state` distingue el flujo).
- Gmail usa `gmail.readonly` (restringido): en producción, verificación de Google.

## 4. Vercel
- Importa el repo, configura las variables de entorno.
- El cron (`vercel.json`) corre `/api/cron/run` cada hora; Vercel añade
  `Authorization: Bearer <CRON_SECRET>` automáticamente.

## 5. Verificación
- `npm run test` (unitarias), `npm run typecheck`, `npm run build`.
- `npm run test:e2e` (Playwright) contra un servidor local o `E2E_BASE_URL`.

## 6. Instalar en iPhone
Abrir en Safari → Compartir → "Agregar a pantalla de inicio". Guía en la app (`/instalar`).
