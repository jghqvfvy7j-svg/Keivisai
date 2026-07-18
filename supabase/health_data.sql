-- =====================================================================
-- Datos importados de Apple Health (Camino B).
-- Guarda entrenamientos (con distancia, tipo, calorías) y resúmenes de
-- frecuencia cardíaca. Se llenan al importar el archivo de Apple Health.
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- =====================================================================

-- Entrenamientos importados de Apple Health / Apple Watch.
create table if not exists public.health_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text,            -- p.ej. "Running", "Traditional Strength Training"
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_min numeric,          -- duración en minutos
  distance_km numeric,           -- distancia (si aplica: correr, caminar, ciclismo)
  active_energy_kcal numeric,    -- calorías activas quemadas
  avg_heart_rate int,            -- FC promedio durante el entreno
  max_heart_rate int,            -- FC máxima durante el entreno
  source text default 'apple_health',
  external_id text,              -- id único del entreno en Apple Health (evita duplicados)
  created_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists idx_health_workouts_user on public.health_workouts(user_id, started_at desc);

-- Resúmenes diarios de frecuencia cardíaca (en reposo, promedio, máxima).
create table if not exists public.health_heart_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  resting_hr int,                -- FC en reposo
  avg_hr int,                    -- FC promedio del día
  max_hr int,                    -- FC máxima del día
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists idx_health_heart_user on public.health_heart_daily(user_id, day desc);

-- RLS: cada usuario solo ve y gestiona lo suyo.
alter table public.health_workouts enable row level security;
alter table public.health_heart_daily enable row level security;

drop policy if exists own_health_workouts on public.health_workouts;
create policy own_health_workouts on public.health_workouts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists own_health_heart on public.health_heart_daily;
create policy own_health_heart on public.health_heart_daily
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

select 'health_workouts' as tabla, count(*) from public.health_workouts
union all
select 'health_heart_daily', count(*) from public.health_heart_daily;
