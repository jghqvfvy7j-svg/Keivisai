# Release Notes

> **Documento PÚBLICO** (equipo, QA y usuarios internos). Explica cada versión de
> forma funcional. El detalle técnico profundo está en `ENGINEERING_LOG.md`
> (interno). No incluye secretos, tokens ni variables privadas.

Cada versión sigue esta estructura:
**Qué cambió · Impacto para el usuario · Qué revisar tras el despliegue ·
Requisitos de configuración · Migraciones SQL · Rollback.**

---

## 1.0.60 — Accesibilidad: contraste (WCAG AA)

- **Qué cambió.** El gris más tenue (texto secundario) se subió para cumplir el
  contraste mínimo AA en ambos temas. El resto de colores ya cumplía.
- **Impacto para el usuario.** Texto secundario más legible (fechas, "/180g",
  etc.), especialmente con poca luz o vista cansada. Sin cambios de layout.
- **Qué revisar tras el despliegue.** Que el texto gris tenue se lea bien en
  tarjetas.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior.

## 1.0.59 — Firma consistente en Progreso

- **Qué cambió.** La tarjeta "Your week" de Progreso enciende sus 3 números
  (workouts, kg, racha) y lleva la hairline volt, igual que la tarjeta principal
  del inicio.
- **Impacto para el usuario.** Coherencia visual: las 3 pantallas de datos (inicio,
  nutrición, progreso) se sienten del mismo instrumento. Sin cambios de función.
- **Qué revisar tras el despliegue.** Abrir Progreso: los números de "Your week"
  animan una vez (fijos con reduce-motion).
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior.

## 1.0.58 — El Home enciende (count-up + detalle firma)

- **Qué cambió.** Los stats clave del inicio (workouts, volumen, vs semana) y la
  racha hacen count-up al cargar; la tarjeta principal lleva una hairline volt.
- **Impacto para el usuario.** El inicio se siente vivo y premium, coherente con
  el anillo de Nutrición. Sin cambios de funcionalidad.
- **Qué revisar tras el despliegue.** Abrir el inicio: los números animan una vez;
  con reduce-motion activado, aparecen fijos.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior.

## 1.0.57 — Identidad visual: tipografía + movimiento

- **Qué cambió.** Fuentes con carácter (Space Grotesk en títulos, JetBrains Mono
  en números) en lugar de las del sistema; y micro-animaciones de "instrumento"
  (el anillo se dibuja y cuenta al cargar). Mismo estilo premium-oscuro.
- **Impacto para el usuario.** La app se siente más propia y premium, menos
  genérica. Sin cambios de funcionalidad.
- **Qué revisar tras el despliegue.** Que los títulos y números se vean con las
  nuevas fuentes en toda la app; que el anillo anime al abrir Nutrición.
- **Requisitos de configuración.** Ninguno (fuentes auto-hospedadas en el repo).
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior (revierte tokens de fuente y el anillo).

## 1.0.56 — Anillo de calorías restantes (Nutrición)

- **Qué cambió.** El bloque "Today" de Nutrición pasó de una barra lineal a un
  anillo circular: calorías restantes al centro, Goal/Consumed, y barras de
  macros (proteína/carbs/grasa) frente a tu meta.
- **Impacto para el usuario.** De un vistazo ves cuánto te queda hoy y cómo van
  tus macros. Complementa la pantalla de Calorie intake (que es el historial).
- **Qué revisar tras el despliegue.** Abrir Nutrición: el anillo se llena según
  lo consumido; al pasar la meta muestra "kcal over" en naranja.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior.

## 1.0.55 — Check-in proactivo por push

- **Qué cambió.** El cron semanal (domingos, a la hora del usuario) envía un
  resumen de nutrición con datos reales (días registrados, promedio de kcal y
  proteína, días que se alcanzó la meta de proteína).
- **Impacto para el usuario.** Un empujón positivo y concreto una vez por semana.
  Se apaga con la preferencia de notificaciones de nutrición.
- **Qué revisar tras el despliegue.** Con VAPID + CRON_SECRET configurados,
  suscribirse a notificaciones y validar (se puede forzar llamando al endpoint de
  cron con el Bearer secreto) que llega el mensaje del domingo.
- **Requisitos de configuración.** VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) y `CRON_SECRET` en Vercel. El cron ya
  estaba declarado en `vercel.json`.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Revertir el bloque de check-in en el cron; el resto de
  recordatorios sigue igual.

## 1.0.54 — Resiliencia offline (PWA)

- **Qué cambió.** El plan activo se guarda en el dispositivo al abrir Tren con
  conexión; una página `/offline` lo muestra read-only cuando no hay red.
- **Impacto para el usuario.** En un gimnasio con mala señal puedes seguir viendo
  tu plan. Registrar series sigue necesitando conexión.
- **Qué revisar tras el despliegue (IMPORTANTE).** Probar en dispositivo real:
  abrir Tren con conexión, poner modo avión, recargar → debe aparecer `/offline`
  con el plan. El fallback del service worker no se puede validar en build.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Revertir `public/sw.js` (el SW se auto-actualiza en la siguiente
  carga; el cambio de `v3`->`v4` limpia la caché vieja).

## 1.0.53 — Editar "lo que tu coach recuerda"

- **Qué cambió.** La pantalla de memoria del coach (Perfil) ya permitía ver,
  borrar y pausar; ahora también **editar** cada memoria, con confirmación al
  borrar todo y una etiqueta de tipo por memoria.
- **Impacto para el usuario.** Más control sobre lo que el coach sabe: corregir
  o afinar una memoria en vez de solo borrarla.
- **Qué revisar tras el despliegue.** En Perfil → Coach memory, editar una
  memoria (lápiz), guardar, y confirmar que persiste al recargar. Probar "Forget
  everything" (pide confirmación).
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior.

## 1.0.52 — El coach usa tus datos de Calorie intake

- **Qué cambió.** El coach (Lucas/Helena) ahora ve tu ingesta comparada con tu
  meta diaria: puede decir "vas en déficit de ~700 kcal" o "proteína 30g bajo la
  meta" y aconsejar con eso.
- **Impacto para el usuario.** Respuestas del coach más concretas y accionables.
- **Qué revisar tras el despliegue.** Preguntar al coach algo como "¿cómo voy con
  la comida esta semana?" y confirmar que menciona meta y déficit/superávit.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy anterior.

## 1.0.51 — Auto-hospedar imágenes de ejercicios

- **Qué cambió.** Las fotos de ejercicios se sirven desde tu Supabase (bucket
  `exercise-media`) en lugar de jsDelivr.
- **Impacto para el usuario.** Ninguno visible; las mismas imágenes, sin depender
  de un CDN externo.
- **Qué revisar tras el despliegue.** Que las imágenes de la librería carguen
  desde tu dominio de Supabase; que `image_url` ya no diga `jsdelivr`.
- **Requisitos de configuración.** Crear el bucket, subir las 668 imágenes (script
  incluido). No requiere variables de entorno nuevas.
- **Migraciones SQL.** No de esquema. Cambio de datos reversible: backup →
  bucket → subir imágenes → `importar_imagenes_autohospedadas.sql` (reemplaza
  `TU-PROYECTO` por tu ref).
- **Rollback.** `supabase/restore_exercise_images.sql` devuelve las URLs previas.

## 1.0.50 — Seguridad: auditoría RLS + rastreo de errores

- **Qué cambió.** (1) Nuevo script de auditoría de seguridad de solo lectura.
  (2) Rastreo de errores con Sentry, opcional y desactivado por defecto.
- **Impacto para el usuario.** Ninguno visible. Internamente, los crashes futuros
  llegarán con stack trace y contexto (si se activa Sentry).
- **Qué revisar tras el despliegue.** Correr `auditoria_seguridad.sql` y revisar
  que no haya tablas sin RLS ni buckets públicos inesperados. Si se configura el
  DSN, forzar un error de prueba y ver que aparece en el panel de Sentry.
- **Requisitos de configuración.** Sentry es OPCIONAL. Para activarlo, definir
  `NEXT_PUBLIC_SENTRY_DSN` (y opcionalmente `SENTRY_DSN`) en Vercel. Sin eso,
  queda no-op.
- **Migraciones SQL.** Ninguna obligatoria. `auditoria_seguridad.sql` es solo
  lectura (no cambia nada). `verificar_seguridad.sql` sigue disponible para
  forzar RLS si la auditoría encuentra algo.
- **Rollback.** Quitar las variables de Sentry desactiva el rastreo. Para revertir
  código, redeploy anterior; sin DSN, el SDK ya es no-op.

---

## 1.0.49 — Sistema de documentación

- **Qué cambió.** Se normalizó y amplió la documentación (CHANGELOG,
  RELEASE_NOTES, ENGINEERING_LOG, VERSIONES) y se creó `DECISIONS.md` (ADRs).
- **Impacto para el usuario.** Ninguno. No cambia la app.
- **Qué revisar tras el despliegue.** Nada funcional; revisar que los enlaces
  entre documentos sean correctos.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Restaurar los archivos `.md` anteriores. No afecta la app.

---

## 1.0.48 — Retiro de animaciones de ejercicios

- **Qué cambió.** Se retiró la función de animaciones (Everkinetic) por calidad
  visual insuficiente. Se eliminó la página `/credits` y sus enlaces, los SQL de
  la función y `ATTRIBUTION.md`.
- **Impacto para el usuario.** Ninguno. Nada llegó a producción; los ejercicios
  siguen con sus fotos actuales (dominio público, free-exercise-db).
- **Qué revisar tras el despliegue.** Que la app abra normal y que no aparezca un
  enlace roto a `/credits`.
- **Requisitos de configuración.** Ninguno.
- **Migraciones SQL.** Ninguna. No se creó bucket ni se corrió import, así que no
  hay nada que revertir en Supabase.
- **Rollback.** Redeploy de la versión anterior.

---

## 1.0.45 — Crash al guardar + tooltip legible

- **Qué cambió.** (1) Guardar en Configuración (y cambiar contraseña / borrar
  cuenta) ya no lleva a "Algo salió mal" si la petición falla. (2) El tooltip de
  Calorie intake se lee en modo oscuro.
- **Impacto para el usuario.** Un guardado con mala red muestra un aviso en vez
  de romper la pantalla; los datos no se pierden.
- **Qué revisar tras el despliegue.** Ajustes → "Guardar cambios" (ver toast, no
  crash). Nutrición → Calorie intake → tocar una barra (tooltip legible).
- **Requisitos de configuración.** Recomendado (no obligatorio): desactivar
  **Attack Challenge Mode** en el Firewall de Vercel — es el disparador más
  probable de los fallos de red intermitentes.
- **Migraciones SQL.** Ninguna.
- **Rollback.** Redeploy de la versión anterior.

---

## 1.0.44 — Calorie intake + arreglos del chat

- **Qué cambió.** "Net Energy" pasó a **Calorie intake** (consumido vs meta,
  macros, tendencias; se quitó el "quemado" estimado). El chat del coach abre en
  el último mensaje, oculta la barra al escribir y **guarda las fotos** enviadas.
- **Impacto para el usuario.** Nutrición más clara y real; el chat ya no pierde
  las fotos ni queda mal ubicado.
- **Qué revisar tras el despliegue.** Abrir Calorie intake y comprobar que los
  números coinciden con la pestaña de Nutrición; enviar una foto al coach,
  recargar y confirmar que persiste.
- **Requisitos de configuración.** Ninguno de código. (La voz del coach requiere
  saldo en la cuenta de OpenAI, aparte.)
- **Migraciones SQL.** `supabase/coach_imagen_en_chat.sql` (una vez) para que las
  fotos del coach persistan.
- **Rollback.** Redeploy anterior. La columna `image_path` es aditiva; puede
  quedarse sin efecto.
