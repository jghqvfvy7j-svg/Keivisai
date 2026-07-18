# 175 ejercicios adicionales (parte 2)

Ya tienes 175 ejercicios. Este archivo agrega ~169 más (llegando a ~344 total),
con etiquetas de equipo correctas para el filtro casa / gimnasio.

## Cómo cargarlo
1. SQL Editor de Supabase → borra todo → pega `ejercicios_parte2.sql` → Run.
2. Es idempotente (usa ON CONFLICT): si lo corres dos veces, no duplica.

## Verificación
- Total: `select count(*) from exercises;` → ~344
- Para casa: `select count(*) from exercises where equipment && ARRAY['peso_corporal','mancuernas','casa','bandas']::equipment_type[];` → ~201

Requiere haber cargado antes `ejercicios_completo.sql` (los primeros 175).
