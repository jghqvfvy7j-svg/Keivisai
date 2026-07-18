# Storage — Fotos de progreso y de ejercicios

Este script crea los "buckets" (carpetas de almacenamiento) y sus permisos.
Necesario para que funcionen las FOTOS DE PROGRESO (antes/después).

## Cómo instalarlo

1. Supabase → SQL Editor → pega y ejecuta `schema_storage_opcional.sql`.

2. Si al ejecutar las POLÍTICAS sale este error:
   `ERROR: must be owner of table objects`
   Es normal (Supabase protege esa tabla). Haz esto en su lugar:
   - Ejecuta SOLO las dos líneas `insert into storage.buckets ...` (crean los buckets).
   - Luego crea las políticas desde la interfaz: **Storage → Policies → New policy**,
     usando las reglas que están en el archivo como referencia.

## Qué crea

- **exercise-images** (público): para imágenes de ejercicios (opcional, ya usas un CDN externo).
- **progress-photos** (privado): donde se guardan las fotos de progreso de cada usuario.

## Seguridad

Las fotos de progreso son **privadas por usuario**: cada quien solo puede ver,
subir y borrar las suyas. Están en carpetas por ID de usuario y protegidas por RLS.

## Después de instalar

También ejecuta `progress_photos.sql` (crea la tabla de metadatos de las fotos).
Con eso, la sección "Progress photos" en la página Body ya funciona.
