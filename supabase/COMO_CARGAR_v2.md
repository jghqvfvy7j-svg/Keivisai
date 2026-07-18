# Actualización v2 — Agentes de IA, nutrición, sesiones, planes

Ejecuta este SQL UNA VEZ para habilitar las nuevas funciones (memoria del
coach, nutrición por día, sesiones con contexto, planes free/pro, límites de
IA y eventos de seguridad).

## Pasos
1. Abre el SQL Editor de Supabase.
2. Borra TODO el editor.
3. Pega el archivo `schema_v2_agentes.sql` completo.
4. Dale **Run** (si aparece "destructive/RLS", usa "Run without RLS" — ya trae sus propias policies).

Es idempotente: lo puedes ejecutar varias veces sin error.

## Qué añade
- `coach_conversations`, `coach_messages`, `coach_memory` — memoria del coach.
- `nutrition_days` + columnas en `nutrition_logs` — nutrición por día/semana.
- Columnas de contexto en `workout_sessions` y `workout_logs` — sesiones.
- `ai_usage` — límites por plan (free 15 mensajes/día de coach).
- `ai_security_events` — registro de intentos maliciosos.
- Columna `plan` en `users_profiles` (free por defecto).
- Funciones `bump_ai_usage` y `recalc_nutrition_day`.

## Variable de entorno nueva (opcional)
En Vercel puedes definir:
    ADMIN_EMAILS=tucorreo@ejemplo.com,otro@ejemplo.com
Los usuarios con esos correos tienen uso ILIMITADO de IA (sin límites de plan).
