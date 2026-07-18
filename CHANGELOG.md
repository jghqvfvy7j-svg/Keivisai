# Changelog

> **Documento PÚBLICO.** Resumen breve de cada versión, orientado al producto.
> Detalle funcional en `RELEASE_NOTES.md`; detalle técnico en `ENGINEERING_LOG.md`
> (interno); decisiones en `DECISIONS.md` (interno); historial completo en español
> en `VERSIONES.md` (interno).

Formato basado en [Keep a Changelog](https://keepachangelog.com).
Categorías: **Added**, **Changed**, **Fixed**, **Removed**, **Security**, **Performance**.

## Versionado semántico (SemVer)

Las versiones siguen `MAJOR.MINOR.PATCH`:
- **Major** — cambios incompatibles (rompen algo existente).
- **Minor** — nuevas funciones compatibles hacia atrás.
- **Patch** — correcciones y mejoras menores, compatibles.

---

## [1.0.60] — 2026-07-17
### Changed
- Mejor legibilidad del texto secundario (gris) para cumplir el contraste mínimo
  de accesibilidad (WCAG AA) en modo oscuro y claro.

## [1.0.59] — 2026-07-17
### Added
- La tarjeta "Your week" de Progreso ahora también enciende sus números y lleva
  el detalle de acento, en línea con el inicio.

## [1.0.58] — 2026-07-17
### Added
- El inicio ahora "enciende": tus números de la semana cuentan al cargar y la
  tarjeta principal lleva un detalle de acento sutil. (Se desactiva con
  reduce-motion.)

## [1.0.57] — 2026-07-17
### Changed
- Nueva tipografía de la app (títulos Space Grotesk, números JetBrains Mono) para
  una identidad más distintiva y premium, manteniendo el estilo oscuro.
### Added
- Micro-animaciones: el anillo de calorías se dibuja y sus números cuentan al
  cargar (se desactivan si tienes reduce-motion).

## [1.0.56] — 2026-07-17
### Changed
- El resumen de "hoy" en Nutrición ahora es un anillo circular con las calorías
  que te faltan al centro y barras de macros frente a tu meta.

## [1.0.55] — 2026-07-14
### Added
- Check-in proactivo por push: un resumen semanal (domingos) de tu nutrición
  frente a tu meta (calorías y proteína). Se puede desactivar con la preferencia
  de notificaciones de nutrición.

## [1.0.54] — 2026-07-14
### Added
- Resiliencia offline: tu plan de entrenamiento activo queda guardado en el
  dispositivo y se puede ver sin conexión en una página de respaldo.

## [1.0.53] — 2026-07-14
### Added
- Ahora puedes editar el texto de lo que tu coach recuerda, y ver una etiqueta
  de tipo (lesión, preferencia, PR, meta) por cada memoria.
### Changed
- "Borrar todo" en la memoria del coach pide confirmación (dos toques).

## [1.0.52] — 2026-07-14
### Changed
- El coach ahora aconseja usando tus números reales de nutrición: compara tu
  promedio de calorías y proteína contra tu meta diaria (déficit/superávit).

## [1.0.51] — 2026-07-14
### Changed
- Las imágenes de ejercicios ahora se sirven desde tu propio Supabase (bucket
  público) en vez de hotlink a jsDelivr. Misma imagen, más control y sin
  dependencia externa. Reversible.
### Performance
- Menos dependencia de un CDN de terceros para cargar imágenes.

## [1.0.50] — 2026-07-14
### Security
- Nueva auditoría de seguridad de solo lectura (`auditoria_seguridad.sql`) que
  detecta tablas sin RLS, tablas sin políticas y buckets públicos inesperados.
- Rastreo de errores (Sentry) opcional: reporta crashes con stack trace. Sin DSN
  configurado queda deshabilitado y la app funciona igual.
### Added
- Los error boundaries reportan a Sentry cuando hay un DSN configurado.

## [1.0.49] — 2026-07-14
### Changed
- Sistema de documentación y control de versiones normalizado y ampliado
  (CHANGELOG, RELEASE_NOTES, ENGINEERING_LOG, VERSIONES) y nuevo `DECISIONS.md`.
  Sin cambios en la app.

## [1.0.48] — 2026-07-14
### Removed
- Función de animaciones de ejercicios (Everkinetic). La calidad de las imágenes
  no cumplía el estándar del producto. Sin impacto para el usuario: los
  ejercicios mantienen sus fotos actuales.

## [1.0.45] — 2026-07-14
### Fixed
- Guardar en Configuración ya no puede tumbar la app con "Algo salió mal": un
  fallo de red al guardar ahora muestra un aviso y deja seguir.
- El tooltip de la gráfica de Calorie intake se lee en modo oscuro (antes salía
  en negro).
### Security
- Todas las llamadas a Server Actions desde el cliente capturan el rechazo de la
  promesa, evitando que un fallo de transporte exponga el error boundary.

## [1.0.44] — 2026-07-14
### Changed
- "Net Energy" ahora es **Calorie intake**: compara lo comido contra tu meta
  diaria (verde bajo la meta, naranja sobre la meta), con promedios y macros.
### Added
- Las fotos enviadas al coach quedan guardadas en el chat.
### Fixed
- El chat del coach abre en el último mensaje, con flecha para bajar, y oculta la
  barra inferior al escribir.
### Removed
- El dato de "quemado" estimado (confuso y poco fiable sin un wearable).

---

_Nota: 1.0.46 y 1.0.47 introdujeron animaciones de ejercicios que se retiraron en
1.0.48 sin haber llegado a producción; se detallan en `VERSIONES.md`._
