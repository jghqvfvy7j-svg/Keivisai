# Cargar la base de datos en Supabase

## Orden de ejecución (IMPORTANTE: borra el editor entre cada paso)

### 1. Schema principal — crea las 11 tablas
Ejecuta `schema.sql` completo. Es re-ejecutable (no da errores de "already exists").
Borra el editor, pega TODO el archivo, y dale **Run** (no "Run selected").

Este archivo YA NO toca el Storage, así que no dará el error
`must be owner of table objects`.

### 2. Ejercicios — 280 ejercicios con imágenes
Carga `seed_01.sql` a `seed_05.sql`, uno por uno:
- Abre el archivo, Ctrl+A, copia.
- BORRA todo el editor de Supabase.
- Pega y dale **Run**.
- Repite con el siguiente.

Verifica al final: `select count(*) from exercises;` → debe dar **280**.

### 3. (OPCIONAL) Storage para fotos de progreso
Solo si vas a usar la función de fotos de progreso del usuario.
Ejecuta `schema_storage_opcional.sql`.

Si al crear las políticas sale `must be owner of table objects`, es normal:
- Los buckets sí se crean (ejecuta solo los "insert into storage.buckets").
- Las políticas créalas desde la interfaz: **Storage → Policies** (asistente visual).

Las imágenes de los ejercicios NO dependen de esto: vienen de un CDN externo
(jsDelivr), así que funcionan aunque no configures el Storage.

---

Todos los seeds usan `on conflict (slug) do nothing`: si repites uno por error,
no se duplican datos.
