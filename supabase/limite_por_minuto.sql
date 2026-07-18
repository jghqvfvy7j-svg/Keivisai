-- =====================================================================
-- Limite por minuto (proteccion contra rafagas).
--
-- El limite diario no impide que un usuario gaste toda su cuota en diez
-- segundos, ni que un script haga cien peticiones seguidas. Esta tabla
-- cuenta las peticiones de IA por usuario y por minuto.
--
-- Ejecutar una vez en el SQL Editor de Supabase. Es idempotente.
-- =====================================================================

create table if not exists public.ai_minute_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  minute  timestamptz not null,   -- siempre truncado al minuto
  count   integer not null default 0,
  primary key (user_id, minute)
);

alter table public.ai_minute_usage enable row level security;

-- Cada quien solo ve y toca sus propias filas.
drop policy if exists "own ai_minute_usage" on public.ai_minute_usage;
create policy "own ai_minute_usage" on public.ai_minute_usage
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- Incremento atomico del contador del minuto actual.
--
-- No recibe el user_id como parametro: lo toma del JWT. Asi es imposible
-- que alguien incremente (o consulte) el contador de otra persona, aunque
-- manipule la llamada.
--
-- Devuelve cuantas peticiones lleva el usuario en el minuto en curso,
-- incluida esta.
-- ---------------------------------------------------------------------
create or replace function public.bump_ai_minute()
returns integer
language plpgsql
security invoker           -- corre como el usuario: la RLS de arriba aplica
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_minute timestamptz := date_trunc('minute', now());
  new_count integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.ai_minute_usage (user_id, minute, count)
  values (uid, current_minute, 1)
  on conflict (user_id, minute)
  do update set count = public.ai_minute_usage.count + 1
  returning count into new_count;

  -- Limpieza barata: de vez en cuando borra las filas viejas del usuario.
  -- No hace falta un cron para esto.
  if random() < 0.02 then
    delete from public.ai_minute_usage
    where user_id = uid and minute < now() - interval '10 minutes';
  end if;

  return new_count;
end;
$$;

grant execute on function public.bump_ai_minute() to authenticated;


-- Reporte final
select
  (select relrowsecurity from pg_class where relname = 'ai_minute_usage') as rls_activa,
  (select count(*) from pg_proc where proname = 'bump_ai_minute') as funcion_creada;
