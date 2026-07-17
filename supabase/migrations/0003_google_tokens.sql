-- ============================================================================
-- 0003_google_tokens.sql
-- Acceso a los tokens (esquema private, NO expuesto por la API) mediante
-- funciones security definer que sólo puede ejecutar el service_role.
-- Así el servidor gestiona tokens sin exponer `private` a PostgREST.
-- ============================================================================

create or replace function public.upsert_google_calendar_tokens(
  p_user uuid,
  p_email text,
  p_calendar_id text,
  p_access text,
  p_refresh text,
  p_expires timestamptz,
  p_scopes text[]
) returns void
language plpgsql
security definer set search_path = private, public
as $$
begin
  insert into private.google_calendar_integrations
    (user_id, account_email, calendar_id, encrypted_access_token, encrypted_refresh_token,
     token_expires_at, scopes, status, last_sync_at)
  values (p_user, p_email, coalesce(p_calendar_id, 'primary'), p_access, p_refresh,
     p_expires, p_scopes, 'conectado', now())
  on conflict (user_id) do update set
    account_email = excluded.account_email,
    calendar_id = coalesce(excluded.calendar_id, private.google_calendar_integrations.calendar_id),
    encrypted_access_token = excluded.encrypted_access_token,
    encrypted_refresh_token = coalesce(excluded.encrypted_refresh_token,
      private.google_calendar_integrations.encrypted_refresh_token),
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes,
    status = 'conectado',
    updated_at = now();
end;
$$;

create or replace function public.get_google_calendar_tokens(p_user uuid)
returns table (
  account_email text,
  calendar_id text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  status text
)
language sql
security definer set search_path = private, public
as $$
  select account_email, calendar_id, encrypted_access_token, encrypted_refresh_token,
         token_expires_at, status
  from private.google_calendar_integrations
  where user_id = p_user;
$$;

create or replace function public.update_google_access_token(
  p_user uuid, p_access text, p_expires timestamptz
) returns void
language sql
security definer set search_path = private, public
as $$
  update private.google_calendar_integrations
     set encrypted_access_token = p_access, token_expires_at = p_expires, updated_at = now()
   where user_id = p_user;
$$;

create or replace function public.disconnect_google_calendar(p_user uuid)
returns void
language sql
security definer set search_path = private, public
as $$
  update private.google_calendar_integrations
     set status = 'revocado', encrypted_access_token = null, encrypted_refresh_token = null,
         updated_at = now()
   where user_id = p_user;
$$;

-- Sólo el servidor (service_role) puede ejecutarlas.
revoke execute on function public.upsert_google_calendar_tokens(uuid, text, text, text, text, timestamptz, text[]) from anon, authenticated;
revoke execute on function public.get_google_calendar_tokens(uuid) from anon, authenticated;
revoke execute on function public.update_google_access_token(uuid, text, timestamptz) from anon, authenticated;
revoke execute on function public.disconnect_google_calendar(uuid) from anon, authenticated;

grant execute on function public.upsert_google_calendar_tokens(uuid, text, text, text, text, timestamptz, text[]) to service_role;
grant execute on function public.get_google_calendar_tokens(uuid) to service_role;
grant execute on function public.update_google_access_token(uuid, text, timestamptz) to service_role;
grant execute on function public.disconnect_google_calendar(uuid) to service_role;
