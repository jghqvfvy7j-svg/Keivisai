-- =====================================================================
-- Bucket privado para las fotos que se envian al coach.
--
-- Mismo patron que progress-photos: privado, y cada usuario solo puede leer y
-- subir dentro de una carpeta que lleva su propio user_id. Asi nadie ve las
-- fotos de otro, ni siquiera con la URL.
--
-- Ejecutar una vez en el SQL Editor. Es idempotente.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('coach-photos', 'coach-photos', false)
on conflict (id) do update set public = excluded.public;

-- Leer: solo tus propios archivos (carpeta = tu user_id).
drop policy if exists "users can read own coach photos" on storage.objects;
create policy "users can read own coach photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Subir: solo dentro de tu propia carpeta.
drop policy if exists "users can upload own coach photos" on storage.objects;
create policy "users can upload own coach photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Borrar: solo las tuyas (por si el usuario quiere limpiar su historial).
drop policy if exists "users can delete own coach photos" on storage.objects;
create policy "users can delete own coach photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
