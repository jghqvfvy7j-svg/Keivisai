-- ============================================================================
-- Keivis Assistant — 0002_rls.sql
-- Row Level Security en TODAS las tablas.
-- Patrón: cada fila pertenece a user_id = auth.uid() (o id = auth.uid() en profiles).
-- El service_role (servidor) omite RLS y hace las escrituras de las tablas de
-- solo-lectura para el cliente (integraciones, auditoría, asistente, etc.).
-- ============================================================================

-- ------- Helper macro (manual): CRUD completo del dueño -----------------------
-- Se escribe explícito por claridad y para poder probarlo (sección 24/35).

-- =========================== profiles ========================================
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ======================= user_preferences ====================================
alter table public.user_preferences enable row level security;
create policy up_select on public.user_preferences for select using (user_id = auth.uid());
create policy up_insert on public.user_preferences for insert with check (user_id = auth.uid());
create policy up_update on public.user_preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ======================= calendar_events =====================================
alter table public.calendar_events enable row level security;
create policy ce_select on public.calendar_events for select using (user_id = auth.uid());
create policy ce_insert on public.calendar_events for insert with check (user_id = auth.uid());
create policy ce_update on public.calendar_events for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ce_delete on public.calendar_events for delete using (user_id = auth.uid());

-- ========================= work_shifts =======================================
alter table public.work_shifts enable row level security;
create policy ws_select on public.work_shifts for select using (user_id = auth.uid());
create policy ws_insert on public.work_shifts for insert with check (user_id = auth.uid());
create policy ws_update on public.work_shifts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ws_delete on public.work_shifts for delete using (user_id = auth.uid());

-- ======================= schedule_imports ====================================
alter table public.schedule_imports enable row level security;
create policy si_select on public.schedule_imports for select using (user_id = auth.uid());
create policy si_insert on public.schedule_imports for insert with check (user_id = auth.uid());
create policy si_update on public.schedule_imports for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy si_delete on public.schedule_imports for delete using (user_id = auth.uid());

-- ======================= delivery_sessions ===================================
alter table public.delivery_sessions enable row level security;
create policy ds_select on public.delivery_sessions for select using (user_id = auth.uid());
create policy ds_insert on public.delivery_sessions for insert with check (user_id = auth.uid());
create policy ds_update on public.delivery_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ds_delete on public.delivery_sessions for delete using (user_id = auth.uid());

-- ======================= workout_sessions ====================================
alter table public.workout_sessions enable row level security;
create policy wo_select on public.workout_sessions for select using (user_id = auth.uid());
create policy wo_insert on public.workout_sessions for insert with check (user_id = auth.uid());
create policy wo_update on public.workout_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wo_delete on public.workout_sessions for delete using (user_id = auth.uid());

-- ============================= goals =========================================
alter table public.goals enable row level security;
create policy g_select on public.goals for select using (user_id = auth.uid());
create policy g_insert on public.goals for insert with check (user_id = auth.uid());
create policy g_update on public.goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy g_delete on public.goals for delete using (user_id = auth.uid());

-- =========================== expenses ========================================
alter table public.expenses enable row level security;
create policy e_select on public.expenses for select using (user_id = auth.uid());
create policy e_insert on public.expenses for insert with check (user_id = auth.uid());
create policy e_update on public.expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy e_delete on public.expenses for delete using (user_id = auth.uid());

-- ============================================================================
-- Tablas de SOLO LECTURA para el cliente.
-- El cliente solo ve lo suyo; INSERT/UPDATE/DELETE los hace el servidor
-- (service_role omite RLS). No se crean políticas de escritura a propósito.
-- ============================================================================
alter table public.goal_progress                enable row level security;
create policy gp_select  on public.goal_progress                for select using (user_id = auth.uid());

alter table public.email_summaries              enable row level security;
create policy es_select  on public.email_summaries              for select using (user_id = auth.uid());

alter table public.assistant_conversations      enable row level security;
create policy ac_select  on public.assistant_conversations      for select using (user_id = auth.uid());

alter table public.assistant_messages           enable row level security;
create policy am_select  on public.assistant_messages           for select using (user_id = auth.uid());

alter table public.assistant_actions            enable row level security;
create policy aa_select  on public.assistant_actions            for select using (user_id = auth.uid());

alter table public.automation_runs              enable row level security;
create policy ar_select  on public.automation_runs              for select using (user_id = auth.uid());

alter table public.audit_logs                   enable row level security;
create policy al_select  on public.audit_logs                   for select using (user_id = auth.uid());

alter table public.idempotency_keys             enable row level security;
-- idempotency_keys: ni lectura desde el cliente (solo servidor). RLS activa sin políticas = sin acceso.

-- ============================================================================
-- Esquema private: tokens OAuth cifrados. NO se expone a la API ni a los
-- roles del cliente. Solo el service_role (servidor) accede.
-- Este es el mecanismo robusto: no depende de REVOKE por columna (que un
-- GRANT posterior podría deshacer), sino de que el rol del cliente nunca
-- tiene USAGE sobre el esquema.
-- ============================================================================
revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

-- Defensa en profundidad (por si algún grant se aplicara por error)
alter table private.gmail_integrations           enable row level security;
alter table private.google_calendar_integrations enable row level security;

grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;

-- El usuario ve su estado de conexión (sin tokens) vía función security definer
grant execute on function public.get_integration_status() to authenticated;
