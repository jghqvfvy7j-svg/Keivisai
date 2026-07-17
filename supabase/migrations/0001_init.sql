-- ============================================================================
-- Keivis Assistant — 0001_init.sql
-- Esquema inicial. Postgres / Supabase.
-- La BD guarda timestamptz (UTC). La zona de negocio (America/New_York) y el
-- "inicio de semana en domingo" se resuelven en la capa de dominio.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Esquema NO expuesto por la API (PostgREST solo publica 'public').
-- Aquí viven los tokens OAuth cifrados: inaccesibles desde el navegador.
create schema if not exists private;

-- Utilidad: mantener updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles (1:1 con auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  timezone              text not null default 'America/New_York',
  locale                text not null default 'es',
  week_starts_on        smallint not null default 0 check (week_starts_on between 0 and 6), -- 0 = domingo
  home_city             text default 'Cincinnati, Ohio',
  default_lunch_start   time default '12:00',
  default_lunch_end     time default '13:00',
  notifications_enabled boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================================
-- user_preferences (1:1)
-- ============================================================================
create table if not exists public.user_preferences (
  id                                 uuid primary key default gen_random_uuid(),
  user_id                            uuid not null unique references auth.users(id) on delete cascade,
  default_work_am_start              time default '06:30',
  default_work_am_end                time default '15:00',
  default_work_pm_start              time default '11:00',
  default_work_pm_end                time default '20:30',
  default_gym_start_offset_minutes   int  default 30,
  default_gym_duration_minutes       int  default 90,
  default_delivery_duration_minutes  int  default 180,
  keep_days_off_free                 boolean not null default true,
  disable_calendar_reminders         boolean not null default true,
  preferred_delivery_location        text default 'Downtown Cincinnati',
  assistant_language                 text not null default 'es',
  theme                              text not null default 'system' check (theme in ('light','dark','system')),
  created_at                         timestamptz not null default now(),
  updated_at                         timestamptz not null default now()
);

-- ============================================================================
-- calendar_events
-- ============================================================================
create table if not exists public.calendar_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  description       text,
  category          text not null default 'otro'
                    check (category in ('trabajo','almuerzo','gimnasio','delivery','descanso','personal','cita','proyecto','otro')),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  timezone          text not null default 'America/New_York',
  location          text,
  status            text not null default 'planificado'
                    check (status in ('planificado','confirmado','completado','cancelado')),
  source            text not null default 'manual'
                    check (source in ('manual','asistente','importacion','google','integracion')),
  blocks_time       boolean not null default true,
  is_optional       boolean not null default false,
  reminders_enabled boolean not null default false,   -- por defecto SIN recordatorios
  google_event_id   text,
  google_calendar_id text,
  sync_status       text not null default 'local'
                    check (sync_status in ('local','pendiente','sincronizado','conflicto','error')),
  recurrence_rule   text,
  dedupe_key        text,                              -- de-duplicación offline
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  check (ends_at >= starts_at)
);
create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, starts_at);
create index if not exists calendar_events_user_cat_idx   on public.calendar_events (user_id, category);
create unique index if not exists calendar_events_dedupe_uidx
  on public.calendar_events (user_id, dedupe_key) where dedupe_key is not null;
create unique index if not exists calendar_events_google_uidx
  on public.calendar_events (user_id, google_event_id) where google_event_id is not null;

-- ============================================================================
-- work_shifts
-- ============================================================================
create table if not exists public.work_shifts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  shift_code        text,
  department        text,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  lunch_start       timestamptz,
  lunch_end         timestamptz,
  source            text not null default 'manual' check (source in ('manual','asistente','importacion')),
  import_batch_id   uuid,
  status            text not null default 'planificado' check (status in ('planificado','confirmado','completado','cancelado')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index if not exists work_shifts_user_start_idx on public.work_shifts (user_id, starts_at);

-- ============================================================================
-- schedule_imports (foto del horario)
-- ============================================================================
create table if not exists public.schedule_imports (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  file_path         text,
  original_filename text,
  status            text not null default 'pendiente'
                    check (status in ('pendiente','procesando','revision','confirmado','descartado')),
  extracted_data    jsonb,
  validation_errors jsonb,
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists schedule_imports_user_idx on public.schedule_imports (user_id, created_at desc);

-- ============================================================================
-- delivery_sessions
-- Aditivos (gross/expenses/net/miles) => columnas generadas.
-- Ratios (por hora/por milla) => capa de dominio con guarda de div/0.
-- ============================================================================
create table if not exists public.delivery_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  platform          text not null default 'doordash',
  work_date         date not null,
  planned_start     timestamptz,
  planned_end       timestamptz,
  actual_start      timestamptz,
  actual_end        timestamptz,
  duration_minutes  int check (duration_minutes is null or duration_minutes >= 0),
  base_pay          numeric(12,2) not null default 0 check (base_pay     >= 0),
  tips              numeric(12,2) not null default 0 check (tips         >= 0),
  bonuses           numeric(12,2) not null default 0 check (bonuses      >= 0),
  other_income      numeric(12,2) not null default 0 check (other_income >= 0),
  gross_income      numeric(12,2) generated always as (base_pay + tips + bonuses + other_income) stored,
  starting_odometer numeric(10,2) check (starting_odometer is null or starting_odometer >= 0),
  ending_odometer   numeric(10,2) check (ending_odometer   is null or ending_odometer   >= 0),
  total_miles       numeric(10,2) generated always as (
                      case when ending_odometer is not null and starting_odometer is not null
                           then ending_odometer - starting_odometer end
                    ) stored,
  active_miles      numeric(10,2) check (active_miles   is null or active_miles   >= 0),
  personal_miles    numeric(10,2) check (personal_miles is null or personal_miles >= 0),
  fuel_expense      numeric(12,2) not null default 0 check (fuel_expense    >= 0),
  toll_expense      numeric(12,2) not null default 0 check (toll_expense    >= 0),
  parking_expense   numeric(12,2) not null default 0 check (parking_expense >= 0),
  other_expense     numeric(12,2) not null default 0 check (other_expense   >= 0),
  total_expenses    numeric(12,2) generated always as (fuel_expense + toll_expense + parking_expense + other_expense) stored,
  net_income        numeric(12,2) generated always as (
                      (base_pay + tips + bonuses + other_income) -
                      (fuel_expense + toll_expense + parking_expense + other_expense)
                    ) stored,
  zone              text,
  status            text not null default 'planificada'
                    check (status in ('planificada','activa','terminada','cancelada')),
  notes             text,
  source            text not null default 'manual' check (source in ('manual','asistente','importacion','integracion')),
  dedupe_key        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists delivery_sessions_user_date_idx on public.delivery_sessions (user_id, work_date desc);
create unique index if not exists delivery_sessions_dedupe_uidx
  on public.delivery_sessions (user_id, dedupe_key) where dedupe_key is not null;

-- ============================================================================
-- workout_sessions
-- ============================================================================
create table if not exists public.workout_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  planned_start     timestamptz,
  planned_end       timestamptz,
  actual_start      timestamptz,
  actual_end        timestamptz,
  workout_type      text,
  status            text not null default 'planificada'
                    check (status in ('planificada','completada','cancelada','parcial')),
  perceived_energy  smallint check (perceived_energy is null or perceived_energy between 1 and 5),
  notes             text,
  dedupe_key        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists workout_sessions_user_idx on public.workout_sessions (user_id, planned_start desc);
create unique index if not exists workout_sessions_dedupe_uidx
  on public.workout_sessions (user_id, dedupe_key) where dedupe_key is not null;

-- ============================================================================
-- goals
-- ============================================================================
create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  type         text not null check (type in
                 ('ganancias','horas','millas','promedio_hora','promedio_milla',
                  'sesiones','entrenamientos','descanso','dias_libres','ahorro','gastos_max')),
  period       text not null check (period in ('diaria','semanal','mensual','personalizada')),
  target_value numeric(12,2) not null,
  unit         text,
  starts_on    date,
  ends_on      date,
  status       text not null default 'activa' check (status in ('activa','pausada','completada','archivada')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists goals_user_status_idx on public.goals (user_id, status);

-- ============================================================================
-- goal_progress (calculado por el servidor)
-- ============================================================================
create table if not exists public.goal_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  goal_id       uuid not null references public.goals(id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  current_value numeric(12,2) not null default 0,
  percentage    numeric(6,2)  not null default 0,
  status        text not null default 'en_camino' check (status in ('en_camino','atrasado','completado','excedido')),
  calculated_at timestamptz not null default now(),
  unique (goal_id, period_start, period_end)
);
create index if not exists goal_progress_user_idx on public.goal_progress (user_id, goal_id);

-- ============================================================================
-- expenses
-- ============================================================================
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  delivery_session_id uuid references public.delivery_sessions(id) on delete set null,
  category            text not null default 'otro'
                      check (category in ('gasolina','peaje','estacionamiento','mantenimiento','otro')),
  amount              numeric(12,2) not null check (amount >= 0),
  expense_date        date not null,
  notes               text,
  receipt_path        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists expenses_user_date_idx on public.expenses (user_id, expense_date desc);

-- ============================================================================
-- Integraciones (tokens cifrados; escritas por el servidor)
-- ============================================================================
create table if not exists private.gmail_integrations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  google_account_email    text,
  encrypted_access_token  text,
  encrypted_refresh_token text,
  token_expires_at        timestamptz,
  scopes                  text[],
  status                  text not null default 'desconectado' check (status in ('desconectado','conectado','error','revocado')),
  last_sync_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index if not exists gmail_integrations_user_uidx on private.gmail_integrations (user_id);

create table if not exists private.google_calendar_integrations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  account_email           text,
  calendar_id             text,
  encrypted_access_token  text,
  encrypted_refresh_token text,
  token_expires_at        timestamptz,
  scopes                  text[],
  sync_token              text,
  status                  text not null default 'desconectado' check (status in ('desconectado','conectado','error','revocado')),
  last_sync_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index if not exists gcal_integrations_user_uidx on private.google_calendar_integrations (user_id);

-- Estado de integración expuesto de forma SEGURA (sin tokens) al usuario.
create or replace function public.get_integration_status()
returns table (provider text, account_email text, status text, last_sync_at timestamptz)
language sql stable security definer set search_path = private, public
as $$
  select 'gmail'::text, google_account_email, status, last_sync_at
    from private.gmail_integrations where user_id = auth.uid()
  union all
  select 'google_calendar'::text, account_email, status, last_sync_at
    from private.google_calendar_integrations where user_id = auth.uid();
$$;

create table if not exists public.email_summaries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  gmail_message_id   text not null,
  sender             text,
  subject            text,
  received_at        timestamptz,
  snippet            text,
  classification     text,
  importance_score   numeric(4,2),
  summary            text,
  requires_attention boolean not null default false,
  user_feedback      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);
create index if not exists email_summaries_attention_idx on public.email_summaries (user_id, requires_attention);

-- ============================================================================
-- Asistente
-- ============================================================================
create table if not exists public.assistant_conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  title                 text,
  openai_conversation_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists assistant_conv_user_idx on public.assistant_conversations (user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool','system')),
  content         text,
  tool_name       text,
  tool_arguments  jsonb,
  tool_result     jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists assistant_msg_conv_idx on public.assistant_messages (conversation_id, created_at);

create table if not exists public.assistant_actions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  conversation_id       uuid references public.assistant_conversations(id) on delete set null,
  action_type           text not null,
  entity_type           text,
  entity_id             uuid,
  payload               jsonb,
  confirmation_required boolean not null default false,
  confirmed_at          timestamptz,
  status                text not null default 'pendiente'
                        check (status in ('pendiente','confirmada','ejecutada','cancelada','error','deshecha')),
  error_message         text,
  created_at            timestamptz not null default now()
);
create index if not exists assistant_actions_user_idx on public.assistant_actions (user_id, created_at desc);

-- ============================================================================
-- Automatizaciones y auditoría (servidor)
-- ============================================================================
create table if not exists public.automation_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  automation_type text not null,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  status          text not null default 'ejecutando' check (status in ('ejecutando','ok','error')),
  result          jsonb,
  error_message   text
);
create index if not exists automation_runs_user_idx on public.automation_runs (user_id, started_at desc);

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  actor_type   text not null check (actor_type in ('user','assistant','automation','mcp','system')),
  actor_id     text,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  before_data  jsonb,
  after_data   jsonb,
  ip_hash      text,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

create table if not exists public.idempotency_keys (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  endpoint   text,
  response   jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ============================================================================
-- Triggers updated_at
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','user_preferences','calendar_events','work_shifts','delivery_sessions',
    'workout_sessions','goals','expenses','email_summaries','assistant_conversations'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- Triggers updated_at para las tablas del esquema private
drop trigger if exists set_updated_at on private.gmail_integrations;
create trigger set_updated_at before update on private.gmail_integrations
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on private.google_calendar_integrations;
create trigger set_updated_at before update on private.google_calendar_integrations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Alta automática de perfil + preferencias al crear usuario
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
