# Checklist de despliegue — GymTrack Pro (acumulado 1.0.44 → 1.0.58)

> No hace falta desplegar versión por versión: despliega el ÚLTIMO código, que
> incluye todo. Lo que importa es cumplir en orden estos pasos de SQL + config.
> Casi todos los SQL son idempotentes (seguro re-correrlos).

## 0. Config crítica (antes que nada)
- [ ] **Desactivar "Attack Challenge Mode"** en Vercel > Firewall. Es el sospechoso
      de los errores de red intermitentes y del crash al guardar.

## 1. Base de datos (SQL Editor de Supabase), en orden
- [ ] **`coach_imagen_en_chat.sql`** — CRÍTICO. Arregla el error "problemas para
      conectarse" del coach y hace que las fotos del chat PERSISTAN. (Es el que te
      falló en producción.)
- [ ] Si el coach o recetas dan errores de columna/tabla, confirma que estén
      corridos: `coach_fotos.sql`, `coach_memoria_consentimiento.sql`,
      `metas_coach.sql`, `recetas.sql`. (Si ya funcionaban, ya están.)
- [ ] `auditoria_seguridad.sql` — auditoría de SOLO LECTURA. Revisa que no haya
      tablas sin RLS ni buckets públicos inesperados. Si algo sale, corre
      `verificar_seguridad.sql`.

## 2. Auto-hospedar imágenes de ejercicios (opcional, recomendado) — en orden
- [ ] `backup_exercise_images.sql` (respaldo, reversible)
- [ ] `exercise_media_bucket.sql` (crea el bucket público `exercise-media`)
- [ ] Subir imágenes: descomprime `exercise-media-imagenes.zip`, coloca la carpeta
      `exercise-media/` en la raíz del proyecto y corre:
      `SUPABASE_URL=https://TU-PROYECTO.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/subir_exercise_media.mjs ./exercise-media`
- [ ] `importar_imagenes_autohospedadas.sql` (reemplaza `TU-PROYECTO` por tu ref)
- [ ] Reversible en cualquier momento con `restore_exercise_images.sql`

## 3. Variables de entorno en Vercel
- [ ] Push / check-ins (1.0.55): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
      `VAPID_SUBJECT`, `CRON_SECRET`. Genera VAPID con `npx web-push generate-vapid-keys`.
      Sin esto, los push simplemente no se envían (no rompe nada).
- [ ] Sentry (opcional, 1.0.50): `NEXT_PUBLIC_SENTRY_DSN`. Sin esto queda apagado.

## 4. Desplegar el código (Vercel)
- [ ] Deploy del último build (1.0.58).

## 5. Pruebas post-deploy
- [ ] Coach: abre el chat (carga sin "problemas para conectarse"), envía una foto,
      recarga → persiste. Responde en tu idioma.
- [ ] Configuración → "Guardar cambios": muestra toast, NO la pantalla de error.
- [ ] Nutrición: el anillo se dibuja y cuenta; barras de macros vs meta.
- [ ] Home: los números "encienden" (count-up).
- [ ] Offline: modo avión → abre Tren → debe verse el plan / la página offline.
- [ ] (Si configuraste push) fuerza el cron con el Bearer secreto para probar el
      check-in semanal.

## Rollback rápido
- Imágenes: `restore_exercise_images.sql`.
- Código: redeploy de la versión anterior en Vercel.
- Sentry/push: quita las variables (se apagan solos).
