-- =====================================================================
-- REESCRIBIR image_url + images de jsDelivr -> tu Storage de Supabase.
--
-- Orden: 1) backup_exercise_images.sql  2) exercise_media_bucket.sql
--        3) SUBIR las imágenes al bucket (script scripts/subir_exercise_media.mjs)
--        4) este archivo.
--
-- >>> Cambia UNA sola cosa: pon el ref de tu proyecto en las 3 apariciones de
--     TU-PROYECTO (Supabase > Project Settings > Data API > Project URL).
--
-- Solo toca filas que apuntan a jsDelivr; lo demás queda intacto. Reversible con
-- restore_exercise_images.sql. Si una imagen faltara, la app cae a un gradiente
-- (ExerciseImage.onError), no rompe.
-- =====================================================================

-- image_url (una URL por fila)
update public.exercises
set image_url = replace(image_url,
    'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/',
    'https://TU-PROYECTO.supabase.co/storage/v1/object/public/exercise-media/')
where image_url like 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/%';

-- images[] (arreglo: se reescribe elemento por elemento)
update public.exercises
set images = (
  select array_agg(replace(u,
      'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/',
      'https://TU-PROYECTO.supabase.co/storage/v1/object/public/exercise-media/'))
  from unnest(images) as u)
where exists (
  select 1 from unnest(images) as u
  where u like 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/%');

-- Confirmación
select count(*) filter (where image_url like '%/exercise-media/%') as image_url_ok,
       count(*) filter (where image_url like '%jsdelivr%')          as aun_en_jsdelivr
from public.exercises;
