-- =====================================================================
-- AUDITORÍA DE SEGURIDAD (solo lectura, no modifica nada)
--
-- Complementa a verificar_seguridad.sql (que FUERZA RLS con una lista fija).
-- Este script DESCUBRE dinámicamente el estado real y lo reporta, así detecta
-- también tablas nuevas que no estén en esa lista. No cambia nada: solo SELECT.
--
-- Ejecuta cada bloque en el SQL Editor de Supabase y revisa los resultados.
-- Lo ideal: ningún hallazgo en los bloques 1, 2 y 4.
-- =====================================================================

-- 1) Tablas de esquema public SIN RLS activada  (deberían ser 0 filas)
select n.nspname as schema, c.relname as tabla, 'RLS DESACTIVADA' as hallazgo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

-- 2) Tablas con RLS activada pero SIN ninguna política  (deberían ser 0 filas)
select c.relname as tabla, 'RLS ON pero SIN POLÍTICAS' as hallazgo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = true
  and not exists (
    select 1 from pg_policy p where p.polrelid = c.oid
  )
order by c.relname;

-- 3) Inventario completo: cada tabla, si tiene RLS y cuántas políticas
select c.relname as tabla,
       c.relrowsecurity as rls_activada,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 4) Buckets de Storage PÚBLICOS  (revisa que solo sean los que quieres públicos)
--    Hoy NO debería haber buckets públicos: coach-photos y progress-photos son
--    privados. Si aparece alguno inesperado, revísalo.
select id, name, public
from storage.buckets
where public = true
order by id;

-- 5) Políticas de Storage por bucket (para revisar acceso a archivos)
select bucket_id_from_qual as info, polname as politica, cmd
from (
  select p.polname,
         case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
              when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as cmd,
         pg_get_expr(p.polqual, p.polrelid) as bucket_id_from_qual
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'objects'
) s
order by politica;
