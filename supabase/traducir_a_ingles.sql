-- =====================================================================
-- Traducir los campos de ejercicios de ESPAÑOL a INGLÉS
-- (force, mechanic, difficulty y la descripción corta).
-- La app está en inglés, así que estos campos deben estar en inglés.
-- Ejecutar una vez en el SQL Editor de Supabase. Idempotente.
-- =====================================================================

-- force: Empuje→Push, Tirón→Pull, Estático→Static
update public.exercises set force = 'Push'   where force in ('Empuje', 'empuje');
update public.exercises set force = 'Pull'   where force in ('Tirón', 'tirón', 'Tiron');
update public.exercises set force = 'Static' where force in ('Estático', 'estático', 'Estatico');

-- mechanic: Compuesto→Compound, Aislamiento→Isolation
update public.exercises set mechanic = 'Compound'  where mechanic in ('Compuesto', 'compuesto');
update public.exercises set mechanic = 'Isolation' where mechanic in ('Aislamiento', 'aislamiento');

-- Regenerar la descripción corta en inglés a partir de force + mechanic.
-- Ej: "A compound push exercise." / "An isolation pull exercise."
update public.exercises
set description = (
  case
    when lower(coalesce(mechanic,'')) = 'isolation' then 'An isolation '
    else 'A compound '
  end
  ||
  case
    when lower(coalesce(force,'')) = 'pull' then 'pull exercise.'
    when lower(coalesce(force,'')) = 'static' then 'static exercise.'
    else 'push exercise.'
  end
)
where description is null
   or description = ''
   or description ilike 'Ejercicio de%'   -- descripciones viejas en español
   or description ilike '%empuje%'
   or description ilike '%tirón%'
   or description ilike '%compuesto%'
   or description ilike '%aislamiento%';

-- Reporte: ¿quedó algo en español?
select 'force' as campo, force as valor, count(*)
from public.exercises
where force is not null and (force ilike '%pu%' or force in ('Empuje','Tirón','Estático'))
group by force
union all
select 'mechanic', mechanic, count(*)
from public.exercises
where mechanic in ('Compuesto','Aislamiento')
group by mechanic;
