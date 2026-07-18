# Cargar la base de datos — versión simple (2 archivos)

## Paso 1 — schema.sql (solo una vez)
Crea las tablas. Es re-ejecutable (no da errores de "already exists").
Borra el editor de Supabase, pega TODO `schema.sql`, dale **Run**.

Si ya lo ejecutaste antes y tus tablas ya existen, puedes saltarte este paso.

## Paso 2 — ejercicios_completo.sql (175 ejercicios en un solo archivo)
Este archivo PRIMERO borra los ejercicios anteriores y LUEGO inserta los 175.
Así evitas duplicados y errores de intentos previos.

Borra TODO el editor, pega TODO `ejercicios_completo.sql`, dale **Run**.

Verifica al final: `select count(*) from exercises;` → debe dar **175**.

---

## Muy importante para que NO falle
- Usa el botón **Run**, no "Run selected".
- SIEMPRE borra por completo el editor antes de pegar (Ctrl+A y Suprimir).
  El editor no se limpia solo, y si queda texto de antes, se mezcla y da
  errores raros como `relation "a" does not exist`.

## Si el editor dice "Query is too large"
Entonces tu editor tiene un límite bajo. Usa la carpeta `seed_parts/`
(5 archivos más pequeños) que viene también en el proyecto, o carga por
psql con el connection string (pestaña "Direct" en el botón Connect).
