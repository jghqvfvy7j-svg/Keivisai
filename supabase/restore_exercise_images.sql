-- =====================================================================
-- RESTAURAR imágenes al estado del backup (deshace el auto-hospedaje).
-- =====================================================================
update public.exercises e
set image_url = b.image_url, images = b.images
from public.exercise_images_backup b
where e.id = b.exercise_id;
select count(*) as ejercicios_restaurados
from public.exercises e join public.exercise_images_backup b on b.exercise_id = e.id;
