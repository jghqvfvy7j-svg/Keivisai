# ⚠️ IMPORTANTE — Instalar la base de datos (arregla los errores)

Los errores que viste ("relation public.users_profiles does not exist",
"relation public.nutrition_logs does not exist") significan que **las tablas
base no existen todavía** en tu Supabase. Por eso el login y el resto fallan.

## Solución: ejecuta UN solo archivo

1. Abre el **SQL Editor** de Supabase.
2. **Borra TODO** lo que haya en el editor (Ctrl+A, Suprimir).
3. Abre `instalar_completo.sql`, cópialo COMPLETO, pégalo.
4. Dale **Run**. Si aparece un aviso de "destructive / RLS", elige **"Run without RLS"**.

Ese archivo hace todo en el orden correcto:
- Parte 1: crea las 11 tablas base (perfil, rutinas, sesiones, nutrición...).
- Parte 2: añade las tablas de IA, memoria del coach y nutrición por día.
- Parte 3: activa el blindaje de seguridad (RLS) para aislar a cada usuario.

Es re-ejecutable: si lo corres otra vez, no rompe nada.

## Después, carga los ejercicios (si aún no lo hiciste)
Ejecuta `ejercicios_completo.sql` (los 175 ejercicios). Ese va aparte porque
es grande. Verifica con: `select count(*) from exercises;` → debe dar 175.

## Verificación final
Al terminar `instalar_completo.sql`, la última consulta imprime una tabla:
cada fila debe decir **rls_enabled = true**. Si todas dicen true, tu base
está lista y segura, y el login funcionará.
