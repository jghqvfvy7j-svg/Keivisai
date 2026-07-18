-- =====================================================================
-- GymTrack Pro — Schema v2: memoria del Coach, nutrición diaria/semanal,
-- y sesiones con contexto para los agentes de IA.
--
-- Es idempotente y NO toca lo existente. Ejecútalo una vez en el
-- SQL Editor de Supabase (borra el editor, pega todo, Run).
-- Si tus tablas no existen aún, ejecuta primero schema.sql.
-- =====================================================================

-- ---------- Conversaciones del Coach (memoria persistente) ----------
create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva conversación',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coach_conversations_user_idx
  on public.coach_conversations (user_id, updated_at desc);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_conv_idx
  on public.coach_messages (conversation_id, created_at);

-- Memoria de largo plazo: hechos que el Coach aprende del usuario
-- (lesiones, preferencias, PRs, notas). Se inyecta como contexto.
create table if not exists public.coach_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'note', -- note | injury | preference | pr | goal
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_memory_user_idx
  on public.coach_memory (user_id, created_at desc);

-- ---------- Resumen nutricional diario (para semanales rápidos) -----
-- nutrition_logs (comidas individuales) ya existe en schema.sql.
-- Esta tabla guarda el total del día para consultas semanales veloces.
create table if not exists public.nutrition_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  calories numeric(7,1) not null default 0,
  protein_g numeric(7,1) not null default 0,
  carbs_g numeric(7,1) not null default 0,
  fats_g numeric(7,1) not null default 0,
  water_ml integer not null default 0,
  meals_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists nutrition_days_user_idx
  on public.nutrition_days (user_id, day desc);

-- Añadir columnas a nutrition_logs para lo que estima el agente
alter table public.nutrition_logs
  add column if not exists source text default 'manual';           -- manual | ai
alter table public.nutrition_logs
  add column if not exists ai_confidence text;                     -- low | medium | high
alter table public.nutrition_logs
  add column if not exists items jsonb;                            -- desglose de alimentos

-- ---------- Sesiones con contexto para el agente -------------------
-- workout_sessions y workout_logs ya existen. Añadimos campos de contexto.
alter table public.workout_sessions
  add column if not exists routine_day_id uuid references public.routine_days(id) on delete set null;
alter table public.workout_sessions
  add column if not exists focus text;
alter table public.workout_sessions
  add column if not exists ai_summary text; -- resumen que genera el coach al terminar

alter table public.workout_logs
  add column if not exists rest_seconds integer;
alter table public.workout_logs
  add column if not exists duration_seconds integer; -- cuánto tardó la serie/ejercicio

-- =====================================================================
-- RLS — cada usuario solo ve lo suyo
-- =====================================================================
alter table public.coach_conversations enable row level security;
alter table public.coach_messages enable row level security;
alter table public.coach_memory enable row level security;
alter table public.nutrition_days enable row level security;

drop policy if exists "own coach_conversations" on public.coach_conversations;
create policy "own coach_conversations" on public.coach_conversations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own coach_messages" on public.coach_messages;
create policy "own coach_messages" on public.coach_messages
  for all to authenticated
  using (exists (
    select 1 from public.coach_conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.coach_conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "own coach_memory" on public.coach_memory;
create policy "own coach_memory" on public.coach_memory
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own nutrition_days" on public.nutrition_days;
create policy "own nutrition_days" on public.nutrition_days
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =====================================================================
-- Función: recalcular el resumen diario cuando cambian las comidas
-- =====================================================================
create or replace function public.recalc_nutrition_day(p_user uuid, p_day date)
returns void language plpgsql security definer as $$
begin
  insert into public.nutrition_days (user_id, day, calories, protein_g, carbs_g, fats_g, water_ml, meals_count, updated_at)
  select
    p_user, p_day,
    coalesce(sum(calories),0), coalesce(sum(protein_g),0),
    coalesce(sum(carbs_g),0), coalesce(sum(fats_g),0),
    coalesce(sum(water_ml),0), count(*), now()
  from public.nutrition_logs
  where user_id = p_user and logged_at::date = p_day
  on conflict (user_id, day) do update set
    calories = excluded.calories, protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g, fats_g = excluded.fats_g,
    water_ml = excluded.water_ml, meals_count = excluded.meals_count,
    updated_at = now();
end;
$$;

-- =====================================================================
-- v2.1 — Planes, uso de IA (rate limit), y eventos de seguridad
-- =====================================================================

-- Plan del usuario (free | pro). Admin se decide por email en el server.
alter table public.users_profiles
  add column if not exists plan text not null default 'free';
alter table public.users_profiles
  add column if not exists nutrition_goal text;

-- Conteo de uso de IA por día (para límites del plan free)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now()::date),
  kind text not null default 'coach',  -- coach | nutrition | routine
  count integer not null default 0,
  unique (user_id, day, kind)
);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, day desc);

-- Eventos de seguridad (prompt injection, sql, etc.)
create table if not exists public.ai_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  snippet text,
  created_at timestamptz not null default now()
);
create index if not exists ai_security_events_idx on public.ai_security_events (created_at desc);

-- Check-in de fatiga tras el entreno
alter table public.workout_sessions
  add column if not exists difficulty_1_10 integer;
alter table public.workout_sessions
  add column if not exists energy_1_10 integer;
alter table public.workout_sessions
  add column if not exists motivation_1_10 integer;
alter table public.workout_sessions
  add column if not exists recovery_1_10 integer;

-- RLS
alter table public.ai_usage enable row level security;
alter table public.ai_security_events enable row level security;

drop policy if exists "own ai_usage" on public.ai_usage;
create policy "own ai_usage" on public.ai_usage
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- security events: el usuario puede insertar los suyos; lectura solo del propio
drop policy if exists "insert own security_events" on public.ai_security_events;
create policy "insert own security_events" on public.ai_security_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id or user_id is null);

drop policy if exists "read own security_events" on public.ai_security_events;
create policy "read own security_events" on public.ai_security_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Incrementar uso de IA de forma atómica y devolver el nuevo total del día
create or replace function public.bump_ai_usage(p_user uuid, p_kind text)
returns integer language plpgsql security definer as $$
declare new_count integer;
begin
  insert into public.ai_usage (user_id, day, kind, count)
  values (p_user, now()::date, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.ai_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
