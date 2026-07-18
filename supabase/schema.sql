create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'goal_type') then
    create type goal_type as enum (
      'ganar_masa_muscular','perder_grasa','tonificar',
      'aumentar_fuerza','mejorar_salud','recomposicion'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'level_type') then
    create type level_type as enum ('principiante','intermedio','avanzado');
  end if;

  if not exists (select 1 from pg_type where typname = 'gender_type') then
    create type gender_type as enum ('masculino','femenino','otro','prefiero_no_decir');
  end if;

  if not exists (select 1 from pg_type where typname = 'equipment_type') then
    create type equipment_type as enum (
      'gimnasio_completo','mancuernas','barras','maquinas','peso_corporal','bandas','casa'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'muscle_group_type') then
    create type muscle_group_type as enum (
      'pecho','espalda','piernas','gluteos','hombros','biceps','triceps','abdomen','cardio','full_body'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'exercise_type') then
    create type exercise_type as enum ('fuerza','hipertrofia','cardio','movilidad','peso_corporal');
  end if;

  if not exists (select 1 from pg_type where typname = 'routine_goal_type') then
    create type routine_goal_type as enum (
      'full_body','push_pull_legs','torso_pierna','hipertrofia',
      'fuerza','perdida_grasa','principiante','intermedio','avanzado'
    );
  end if;
end $$;

create table if not exists public.users_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  age integer check (age between 10 and 100),
  gender gender_type,
  height_cm numeric(5,1),
  current_weight_kg numeric(5,1),
  goal goal_type not null default 'mejorar_salud',
  level level_type not null default 'principiante',
  training_days integer not null default 3 check (training_days between 1 and 7),
  session_duration_minutes integer not null default 60,
  injuries text,
  equipment_available equipment_type[] not null default '{}',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  instructions text[] not null default '{}',
  main_muscle muscle_group_type not null,
  secondary_muscles muscle_group_type[] not null default '{}',
  equipment equipment_type[] not null default '{}',
  difficulty level_type not null default 'principiante',
  type exercise_type not null,
  image_url text,
  images text[] not null default '{}',
  force text,
  mechanic text,
  common_mistakes text[] not null default '{}',
  tips text[] not null default '{}',
  recommended_sets integer not null default 3,
  recommended_reps text not null default '8-12',
  recommended_rest_seconds integer not null default 90,
  alternatives text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists exercises_main_muscle_idx on public.exercises (main_muscle);
create index if not exists exercises_equipment_idx on public.exercises using gin (equipment);
create index if not exists exercises_difficulty_idx on public.exercises (difficulty);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal routine_goal_type not null,
  days_per_week integer not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists routines_user_id_idx on public.routines (user_id);

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_name text not null,
  day_order integer not null,
  focus text not null default ''
);
create index if not exists routine_days_routine_id_idx on public.routine_days (routine_id);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sets integer not null default 3,
  reps text not null default '8-12',
  suggested_weight_kg numeric(6,2),
  rest_seconds integer not null default 90,
  notes text,
  order_index integer not null default 0
);
create index if not exists routine_exercises_day_idx on public.routine_exercises (routine_day_id);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references public.routines(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,
  total_volume_kg numeric(10,2),
  total_sets integer,
  total_reps integer,
  notes text
);
create index if not exists workout_sessions_user_id_idx on public.workout_sessions (user_id, started_at desc);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  set_number integer not null,
  weight_kg numeric(6,2),
  reps integer,
  rpe numeric(3,1) check (rpe between 1 and 10),
  completed boolean not null default false,
  notes text
);
create index if not exists workout_logs_session_idx on public.workout_logs (session_id);
create index if not exists workout_logs_exercise_idx on public.workout_logs (exercise_id);

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  waist_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  leg_cm numeric(5,1),
  hip_cm numeric(5,1),
  progress_photo_url text,
  notes text,
  recorded_at timestamptz not null default now()
);
create index if not exists body_metrics_user_id_idx on public.body_metrics (user_id, recorded_at desc);

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_name text not null,
  calories numeric(6,1),
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fats_g numeric(6,1),
  water_ml integer,
  notes text,
  logged_at timestamptz not null default now()
);
create index if not exists nutrition_logs_user_id_idx on public.nutrition_logs (user_id, logged_at desc);

create table if not exists public.favorite_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  message text not null,
  related_exercise_id uuid references public.exercises(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists recommendations_user_id_idx on public.recommendations (user_id, is_read);

alter table public.users_profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_logs enable row level security;
alter table public.body_metrics enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.favorite_exercises enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists "select own profile" on public.users_profiles;
create policy "select own profile" on public.users_profiles
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insert own profile" on public.users_profiles;
create policy "insert own profile" on public.users_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "update own profile" on public.users_profiles;
create policy "update own profile" on public.users_profiles
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "delete own profile" on public.users_profiles;
create policy "delete own profile" on public.users_profiles
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "exercises are publicly readable" on public.exercises;
create policy "exercises are publicly readable" on public.exercises
for select to public using (true);

drop policy if exists "only admin can write exercises" on public.exercises;
create policy "only admin can write exercises" on public.exercises
for all to authenticated
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "manage own routines" on public.routines;
create policy "manage own routines" on public.routines
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "manage own routine_days" on public.routine_days;
create policy "manage own routine_days" on public.routine_days
for all to authenticated
using (exists (
  select 1 from public.routines r
  where r.id = routine_id and r.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.routines r
  where r.id = routine_id and r.user_id = (select auth.uid())
));

drop policy if exists "manage own routine_exercises" on public.routine_exercises;
create policy "manage own routine_exercises" on public.routine_exercises
for all to authenticated
using (exists (
  select 1
  from public.routine_days rd
  join public.routines r on r.id = rd.routine_id
  where rd.id = routine_day_id and r.user_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.routine_days rd
  join public.routines r on r.id = rd.routine_id
  where rd.id = routine_day_id and r.user_id = (select auth.uid())
));

drop policy if exists "manage own workout_sessions" on public.workout_sessions;
create policy "manage own workout_sessions" on public.workout_sessions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "manage own workout_logs" on public.workout_logs;
create policy "manage own workout_logs" on public.workout_logs
for all to authenticated
using (exists (
  select 1 from public.workout_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.workout_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
));

drop policy if exists "manage own body_metrics" on public.body_metrics;
create policy "manage own body_metrics" on public.body_metrics
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "manage own nutrition_logs" on public.nutrition_logs;
create policy "manage own nutrition_logs" on public.nutrition_logs
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "manage own favorites" on public.favorite_exercises;
create policy "manage own favorites" on public.favorite_exercises
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "manage own recommendations" on public.recommendations;
create policy "manage own recommendations" on public.recommendations
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_profiles_updated_at on public.users_profiles;
create trigger users_profiles_updated_at
before update on public.users_profiles
for each row execute function public.set_updated_at();

drop trigger if exists routines_updated_at on public.routines;
create trigger routines_updated_at
before update on public.routines
for each row execute function public.set_updated_at();
