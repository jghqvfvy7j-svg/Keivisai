-- =====================================================================
-- OPCIONAL — Buckets de Storage y politicas para fotos de progreso.
--
-- Si al ejecutar las POLITICAS sale: ERROR: must be owner of table objects
-- es normal. Haz esto:
--   1) Ejecuta solo los "insert into storage.buckets" (crean los buckets).
--   2) Crea las politicas desde la interfaz: Storage -> Policies.
-- No es obligatorio: las imagenes de ejercicios vienen de un CDN externo.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set name = excluded.name, public = excluded.public;

drop policy if exists "only admin can upload exercise images" on storage.objects;
create policy "only admin can upload exercise images"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'exercise-images'
  and coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

drop policy if exists "users can read own progress photos" on storage.objects;
create policy "users can read own progress photos"
on storage.objects
for select to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users can upload own progress photos" on storage.objects;
create policy "users can upload own progress photos"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "users can delete own progress photos" on storage.objects;
create policy "users can delete own progress photos"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
