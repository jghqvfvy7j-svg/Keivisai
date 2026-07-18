-- =====================================================================
-- VERIFICACIÓN Y BLINDAJE DE SEGURIDAD (aislamiento por usuario)
--
-- Ejecuta esto en el SQL Editor de Supabase. Garantiza que TODAS las
-- tablas con datos de usuario tengan RLS activada y su política de
-- "solo el dueño". Es idempotente: puedes correrlo las veces que quieras.
--
-- Al final imprime una tabla: cada fila debe decir rls_enabled = true.
-- Si alguna dice false, algo quedó sin proteger.
-- =====================================================================

-- 1) Forzar RLS en todas las tablas de usuario (por si alguna quedó off)
do $$
declare t text;
begin
  foreach t in array array[
    'users_profiles','routines','routine_days','routine_exercises',
    'workout_sessions','workout_logs','body_metrics','nutrition_logs',
    'favorite_exercises','recommendations','coach_conversations',
    'coach_messages','coach_memory','nutrition_days','ai_usage',
    'ai_security_events'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- 2) Reafirmar políticas "solo el dueño" en las tablas con user_id directo
do $$
declare t text;
begin
  foreach t in array array[
    'users_profiles','routines','workout_sessions','body_metrics',
    'nutrition_logs','favorite_exercises','recommendations',
    'coach_conversations','coach_memory','nutrition_days','ai_usage'
  ]
  loop
    execute format('drop policy if exists %I on public.%I;', 'own_'||t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using ((select auth.uid()) = user_id) '
      || 'with check ((select auth.uid()) = user_id);',
      'own_'||t, t
    );
  end loop;
end $$;

-- 3) Reporte final: ¿está RLS activa en cada tabla de usuario?
select
  c.relname as tabla,
  c.relrowsecurity as rls_enabled,
  count(p.polname) as num_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in (
    'users_profiles','routines','routine_days','routine_exercises',
    'workout_sessions','workout_logs','body_metrics','nutrition_logs',
    'favorite_exercises','recommendations','coach_conversations',
    'coach_messages','coach_memory','nutrition_days','ai_usage',
    'ai_security_events'
  )
group by c.relname, c.relrowsecurity
order by rls_enabled asc, c.relname;
