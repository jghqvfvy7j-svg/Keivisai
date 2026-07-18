-- =====================================================================
-- Notificaciones push — suscripciones y preferencias
-- Ejecutar en el SQL Editor de Supabase (después del schema base).
-- Idempotente.
-- =====================================================================

-- Suscripciones push del navegador (una por dispositivo/navegador).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_sub_user on public.push_subscriptions(user_id);

-- Preferencias de recordatorios por usuario.
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_workout boolean not null default true,     -- recordatorio diario de entrenar
  inactivity boolean not null default true,        -- aviso si lleva días sin entrenar
  nutrition boolean not null default true,         -- recordar registrar comidas
  streak_risk boolean not null default true,       -- racha en peligro
  reminder_hour int not null default 18,           -- hora local preferida (0-23)
  timezone_offset int not null default 0,          -- offset en minutos vs UTC
  updated_at timestamptz not null default now()
);

-- RLS: cada usuario solo ve/gestiona lo suyo.
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;

drop policy if exists own_push_subscriptions on public.push_subscriptions;
create policy own_push_subscriptions on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists own_notification_prefs on public.notification_prefs;
create policy own_notification_prefs on public.notification_prefs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Verificación
select 'push_subscriptions' as tabla, count(*) from public.push_subscriptions
union all
select 'notification_prefs', count(*) from public.notification_prefs;
