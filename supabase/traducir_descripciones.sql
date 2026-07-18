-- =====================================================================
-- Traduce al inglés las descripciones de ejercicios que quedaron en
-- español ("Ejercicio de..."). Ejecutar UNA vez en el SQL Editor.
-- Es seguro: solo actualiza esas filas, idempotente.
-- =====================================================================

update public.exercises set description = 'A compound push exercise.'   where description = 'Ejercicio de empuje, compuesto.';
update public.exercises set description = 'An isolation push exercise.'  where description = 'Ejercicio de empuje, aislamiento.';
update public.exercises set description = 'A compound pull exercise.'    where description = 'Ejercicio de tirón, compuesto.';
update public.exercises set description = 'An isolation pull exercise.'  where description = 'Ejercicio de tirón, aislamiento.';
update public.exercises set description = 'A compound static exercise.'  where description = 'Ejercicio de estático, compuesto.';
update public.exercises set description = 'An isolation static exercise.' where description = 'Ejercicio de estático, aislamiento.';

-- Verificación: debe dar 0
select count(*) as descripciones_en_espanol
from public.exercises
where description like 'Ejercicio de%';
