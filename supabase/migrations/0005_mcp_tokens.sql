-- ============================================================================
-- 0005_mcp_tokens.sql
-- Tokens de acceso revocables para el servidor MCP (ChatGPT).
-- Se guarda SOLO el hash (nunca el secreto).
-- Tabla de SERVIDOR: el cliente no la toca directamente; toda la gestión pasa por
-- /api/mcp/tokens con service_role, que resuelve el user_id de la sesión.
-- (La protección por columna no basta: un GRANT de tabla la anula, así que se
--  bloquea el acceso del cliente por completo.)
-- ============================================================================

create table if not exists public.mcp_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text,
  token_hash   text not null,
  token_prefix text not null,
  scopes       text[] not null default array['read', 'write_safe'],
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create unique index if not exists mcp_tokens_hash_uidx on public.mcp_tokens (token_hash);
create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id, created_at desc);

-- RLS activa sin políticas para el cliente => sin acceso. El service_role la omite.
alter table public.mcp_tokens enable row level security;
revoke all on public.mcp_tokens from anon, authenticated;
grant all on public.mcp_tokens to service_role;
