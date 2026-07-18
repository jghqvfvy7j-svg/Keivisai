-- ============================================================================
-- Keivis Assistant — seed.sql (solo desarrollo, datos ficticios)
-- Requisito: el usuario debe existir en auth.users.
--   1) Crea el usuario en Supabase (Auth > Users) o con la CLI.
--   2) Copia su UUID en v_user (abajo).
--   3) Ejecuta este seed.
-- La semana se construye desde el DOMINGO relativo a la fecha actual.
-- No se crean recordatorios (reminders_enabled = false por defecto).
-- ============================================================================

-- Helper de sesión: construye timestamptz (día + hora) en America/New_York.
create or replace function pg_temp.mkts(d date, t time)
returns timestamptz
language sql stable
as $f$ select ((d::timestamp + t) at time zone 'America/New_York'); $f$;

do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000001'; -- <-- REEMPLAZA por tu UUID real
  v_sun  date := current_date - extract(dow from current_date)::int;  -- domingo de esta semana
  v_tz   text := 'America/New_York';
begin
  if not exists (select 1 from auth.users where id = v_user) then
    raise notice 'El usuario % no existe en auth.users. Crea el usuario y ajusta v_user.', v_user;
    return;
  end if;

  -- Perfil y preferencias (por si el trigger no corrió)
  insert into public.profiles (id, full_name, home_city)
  values (v_user, 'Keivis Severiche', 'Cincinnati, Ohio')
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.user_preferences (user_id) values (v_user)
  on conflict (user_id) do nothing;

  -- Limpieza idempotente del seed anterior
  delete from public.calendar_events where user_id = v_user and metadata->>'seed' = 'true';

  -- Turnos + almuerzo: Dom, Lun, Mié, Jue 06:30-15:00 ; Sáb 11:00-20:30
  -- Martes y Viernes: LIBRES (sin eventos)
  insert into public.calendar_events (user_id, title, category, starts_at, ends_at, timezone, source, metadata)
  values
    (v_user, 'Trabajo',  'trabajo',  pg_temp.mkts(v_sun+0,'06:30'), pg_temp.mkts(v_sun+0,'15:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Almuerzo', 'almuerzo', pg_temp.mkts(v_sun+0,'12:00'), pg_temp.mkts(v_sun+0,'13:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Trabajo',  'trabajo',  pg_temp.mkts(v_sun+1,'06:30'), pg_temp.mkts(v_sun+1,'15:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Almuerzo', 'almuerzo', pg_temp.mkts(v_sun+1,'12:00'), pg_temp.mkts(v_sun+1,'13:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Trabajo',  'trabajo',  pg_temp.mkts(v_sun+3,'06:30'), pg_temp.mkts(v_sun+3,'15:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Almuerzo', 'almuerzo', pg_temp.mkts(v_sun+3,'12:00'), pg_temp.mkts(v_sun+3,'13:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Gimnasio', 'gimnasio', pg_temp.mkts(v_sun+3,'15:30'), pg_temp.mkts(v_sun+3,'17:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'DoorDash', 'delivery', pg_temp.mkts(v_sun+3,'17:30'), pg_temp.mkts(v_sun+3,'20:30'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Trabajo',  'trabajo',  pg_temp.mkts(v_sun+4,'06:30'), pg_temp.mkts(v_sun+4,'15:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Almuerzo', 'almuerzo', pg_temp.mkts(v_sun+4,'12:00'), pg_temp.mkts(v_sun+4,'13:00'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Trabajo',  'trabajo',  pg_temp.mkts(v_sun+6,'11:00'), pg_temp.mkts(v_sun+6,'20:30'), v_tz, 'asistente', '{"seed":"true"}'),
    (v_user, 'Almuerzo', 'almuerzo', pg_temp.mkts(v_sun+6,'14:00'), pg_temp.mkts(v_sun+6,'15:00'), v_tz, 'asistente', '{"seed":"true"}');

  -- Sesión de DoorDash de ejemplo (miércoles), completada
  insert into public.delivery_sessions
    (user_id, platform, work_date, actual_start, actual_end, duration_minutes,
     base_pay, tips, bonuses, starting_odometer, ending_odometer, fuel_expense, zone, status, source)
  values
    (v_user, 'doordash', v_sun+3, pg_temp.mkts(v_sun+3,'17:30'), pg_temp.mkts(v_sun+3,'20:30'), 180,
     52.00, 31.35, 4.00, 40000.0, 40054.2, 6.50, 'Downtown Cincinnati', 'terminada', 'asistente');

  -- Metas iniciales sugeridas (editables)
  insert into public.goals (user_id, name, type, period, target_value, unit)
  values
    (v_user, 'Horas de DoorDash por semana',  'horas',          'semanal', 12,  'horas'),
    (v_user, 'Sesiones por semana',           'sesiones',       'semanal', 4,   'sesiones'),
    (v_user, 'Entrenamientos por semana',     'entrenamientos', 'semanal', 4,   'sesiones'),
    (v_user, 'Ingreso semanal (placeholder)', 'ganancias',      'semanal', 300, 'USD');

  raise notice 'Seed cargado para %', v_user;
end $$;
