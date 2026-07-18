-- =====================================================================
-- Coach: memoria por usuario, con consentimiento explicito.
--
-- Que hace este script:
--   1. Elimina la tabla coach_knowledge (conocimiento global del admin).
--      Se descarta a proposito: era el unico dato del coach compartido
--      entre usuarios. Ahora cada usuario tiene su propio agente aislado.
--   2. Anade el consentimiento por usuario para que el coach recuerde cosas.
--      Por defecto es FALSE: nadie es recordado sin decir que si.
--
-- Ejecutar una vez en el SQL Editor de Supabase. Es idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quitar el conocimiento global (si llegaste a crearlo)
-- ---------------------------------------------------------------------
drop table if exists public.coach_knowledge cascade;
drop function if exists public.is_gymtrack_admin() cascade;


-- ---------------------------------------------------------------------
-- 2. Consentimiento explicito para la memoria del coach
-- ---------------------------------------------------------------------
alter table public.users_profiles
  add column if not exists coach_memory_consent boolean not null default false;

alter table public.users_profiles
  add column if not exists coach_memory_consent_at timestamptz;

-- Marca de "ya se le pregunto". Sirve para distinguir tres estados:
--   prompted_at NULL              -> nunca se le pregunto, hay que preguntarle
--   prompted_at + consent TRUE    -> dijo que si
--   prompted_at + consent FALSE   -> dijo que no, no volver a molestarlo
alter table public.users_profiles
  add column if not exists coach_memory_prompted_at timestamptz;

comment on column public.users_profiles.coach_memory_consent is
  'El usuario acepto que el coach recuerde datos suyos entre conversaciones. Por defecto false.';

comment on column public.users_profiles.coach_memory_prompted_at is
  'Cuando se le pregunto por la memoria del coach. NULL = aun no se le ha preguntado.';


-- ---------------------------------------------------------------------
-- 3. Refuerzo del aislamiento de la memoria del coach
--    (RLS ya existia; se reafirma aqui para que quede explicito)
-- ---------------------------------------------------------------------
alter table public.coach_memory enable row level security;

drop policy if exists "own coach_memory" on public.coach_memory;
create policy "own coach_memory" on public.coach_memory
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- Reporte final
-- ---------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'coach_knowledge') as coach_knowledge_existe,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'users_profiles'
       and column_name in ('coach_memory_consent', 'coach_memory_prompted_at')) as columnas_consentimiento,
  (select relrowsecurity from pg_class where relname = 'coach_memory') as coach_memory_rls;
