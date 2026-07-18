-- =====================================================================
-- Metas de nutricion fijadas por el coach.
--
-- La app calcula una meta automatica (Mifflin-St Jeor). Estas columnas guardan
-- una meta MANUAL que el coach puede fijar cuando el usuario se lo pide ("mira
-- mi peso y dame las calorias que debo comer"). Si estan puestas, mandan sobre
-- el calculo automatico; si son NULL, la app sigue calculando como siempre.
--
-- Ejecutar una vez en el SQL Editor. Es idempotente.
-- =====================================================================

alter table public.users_profiles
  add column if not exists custom_calories integer,
  add column if not exists custom_protein_g integer,
  add column if not exists custom_carbs_g integer,
  add column if not exists custom_fats_g integer,
  add column if not exists custom_targets_set_at timestamptz,
  -- De donde vino la meta manual: 'coach' o 'user'. Solo informativo.
  add column if not exists custom_targets_source text;

-- Sanidad: nada de numeros absurdos que rompan la UI o hagan dano.
do $$ begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'users_profiles' and constraint_name = 'custom_calories_sane'
  ) then
    alter table public.users_profiles
      add constraint custom_calories_sane
      check (custom_calories is null or (custom_calories between 1000 and 6000));
  end if;
end $$;

select
  count(*) filter (where custom_calories is not null) as usuarios_con_meta_manual
from public.users_profiles;
