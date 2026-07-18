-- =====================================================================
-- COPIA DE SEGURIDAD de las imágenes de ejercicios (correr ANTES de auto-hospedar).
-- Guarda image_url + images actuales por ejercicio. Idempotente y no destructivo:
-- la primera corrida captura el estado actual; re-correrlo NO lo sobrescribe.
-- =====================================================================
create table if not exists public.exercise_images_backup (
  exercise_id  uuid primary key references public.exercises(id) on delete cascade,
  slug         text not null,
  image_url    text,
  images       text[] not null default '{}',
  backed_up_at timestamptz not null default now()
);
insert into public.exercise_images_backup (exercise_id, slug, image_url, images)
select id, slug, image_url, images from public.exercises
on conflict (exercise_id) do nothing;
select count(*) as ejercicios_respaldados from public.exercise_images_backup;
