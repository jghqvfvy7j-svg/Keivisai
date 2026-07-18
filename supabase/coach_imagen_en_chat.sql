-- =====================================================================
-- Persistir la imagen en el chat del coach.
--
-- Hasta ahora, al guardar un mensaje solo se escribia el TEXTO en
-- coach_messages.content. La foto se subia a Storage y el coach la veia,
-- pero la referencia no quedaba con el mensaje, asi que al recargar el chat
-- la imagen desaparecia (el turno quedaba como texto solo).
--
-- Esta columna guarda la RUTA de la foto en el bucket privado coach-photos
-- (ej. "<user_id>/archivo.jpg"). Al recargar, la app genera una URL firmada
-- de 1h desde esa ruta para volver a mostrar la miniatura. Es la misma ruta
-- protegida por RLS de coach_fotos.sql: nadie ve la foto de otro.
--
-- Ejecutar una vez en el SQL Editor. Es idempotente.
-- =====================================================================

alter table public.coach_messages
  add column if not exists image_path text;
