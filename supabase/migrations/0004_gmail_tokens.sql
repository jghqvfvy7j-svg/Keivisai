-- ============================================================================
-- 0004_gmail_tokens.sql
-- RPCs security definer para los tokens de Gmail (esquema private, no expuesto).
-- Sólo el service_role puede ejecutarlas. Igual patrón que 0003 (calendario).
-- ============================================================================

create or replace function public.upsert_gmail_tokens(
  p_user uuid,
  p_email text,
  p_access text,
  p_refresh text,
  p_expires timestamptz,
  p_scopes text[]
) returns void
language plpgsql
security definer set search_path = private, public
as $$
begin
  insert into private.gmail_integrations
    (user_id, google_account_email, encrypted_access_token, encrypted_refresh_token,
     token_expires_at, scopes, status, last_sync_at)
  values (p_user, p_email, p_access, p_refresh, p_expires, p_scopes, 'conectado', now())
  on conflict (user_id) do update set
    google_account_email = excluded.google_account_email,
    encrypted_access_token = excluded.encrypted_access_token,
    encrypted_refresh_token = coalesce(excluded.encrypted_refresh_token,
      private.gmail_integrations.encrypted_refresh_token),
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes,
    status = 'conectado',
    updated_at = now();
end;
$$;

create or replace function public.get_gmail_tokens(p_user uuid)
returns table (
  google_account_email text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  status text
)
language sql
security definer set search_path = private, public
as $$
  select google_account_email, encrypted_access_token, encrypted_refresh_token,
         token_expires_at, status
  from private.gmail_integrations
  where user_id = p_user;
$$;

create or replace function public.update_gmail_access_token(
  p_user uuid, p_access text, p_expires timestamptz
) returns void
language sql
security definer set search_path = private, public
as $$
  update private.gmail_integrations
     set encrypted_access_token = p_access, token_expires_at = p_expires, updated_at = now()
   where user_id = p_user;
$$;

create or replace function public.disconnect_gmail(p_user uuid)
returns void
language sql
security definer set search_path = private, public
as $$
  update private.gmail_integrations
     set status = 'revocado', encrypted_access_token = null, encrypted_refresh_token = null,
         updated_at = now()
   where user_id = p_user;
$$;

revoke execute on function public.upsert_gmail_tokens(uuid, text, text, text, timestamptz, text[]) from anon, authenticated;
revoke execute on function public.get_gmail_tokens(uuid) from anon, authenticated;
revoke execute on function public.update_gmail_access_token(uuid, text, timestamptz) from anon, authenticated;
revoke execute on function public.disconnect_gmail(uuid) from anon, authenticated;

grant execute on function public.upsert_gmail_tokens(uuid, text, text, text, timestamptz, text[]) to service_role;
grant execute on function public.get_gmail_tokens(uuid) to service_role;
grant execute on function public.update_gmail_access_token(uuid, text, timestamptz) to service_role;
grant execute on function public.disconnect_gmail(uuid) to service_role;
