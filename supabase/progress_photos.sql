-- =====================================================================
-- Fotos de progreso (antes/después). Guarda solo los metadatos; la imagen
-- va al bucket 'progress-photos' (ya creado en schema_storage_opcional.sql).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- =====================================================================

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,       -- ruta dentro del bucket: {user_id}/{uuid}.jpg
  weight_kg numeric,                 -- peso opcional en el momento de la foto
  note text,                         -- nota opcional
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_photos_user on public.progress_photos(user_id, taken_at desc);

alter table public.progress_photos enable row level security;

drop policy if exists own_progress_photos on public.progress_photos;
create policy own_progress_photos on public.progress_photos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

select 'progress_photos' as tabla, count(*) from public.progress_photos;
