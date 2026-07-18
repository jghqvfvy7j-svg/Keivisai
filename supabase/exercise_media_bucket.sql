-- =====================================================================
-- Bucket PÚBLICO para las imágenes de ejercicios auto-hospedadas.
-- Son de dominio público (free-exercise-db), pensadas para verse por cualquiera.
-- Correr una vez. Idempotente. Luego sube la carpeta exercise-media/ al bucket.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read exercise media" on storage.objects;
create policy "public read exercise media"
on storage.objects for select to public
using (bucket_id = 'exercise-media');
