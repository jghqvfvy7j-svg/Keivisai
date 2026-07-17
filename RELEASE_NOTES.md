# Notas de versión

Explicación funcional de cada versión, pensada para el equipo y usuarios internos.

---

## v0.11.0 — Endurecimiento (última fase del roadmap)

**Qué cambia**
- La app se protege de ráfagas de peticiones y añade cabeceras de seguridad.
- Mejoras de accesibilidad (saltar al contenido, foco visible) y registro estructurado
  para diagnóstico.
- Pruebas end-to-end (Playwright) y documentación completa de despliegue, seguridad y
  privacidad.

**Estado del producto**
- Con esta fase se cumplen los 22 criterios de aceptación del roadmap. La app es
  instalable, funciona offline parcialmente, protege los datos con RLS, no crea alarmas
  por defecto y el asistente ejecuta acciones con confirmación y auditoría.

---

## v0.10.0 — Conector ChatGPT (MCP)

**Qué puedes hacer ahora**
- En **Ajustes → Conector ChatGPT (MCP)**, genera un token y copia la URL del servidor.
- Conéctalo en ChatGPT (Developer Mode) para que pueda consultar tu semana, ver metas
  y registrar delivery/eventos usando las mismas herramientas seguras del asistente.
- Revoca cualquier token cuando quieras; ChatGPT pierde el acceso al instante.

**Qué debes saber**
- Sólo herramientas de lectura y registro; borrar no está disponible por MCP.
- Requiere HTTPS y un plan de ChatGPT con MCP/Developer Mode. Ver `docs/MCP.md`.
- La app funciona igual aunque no conectes MCP.

---

## v0.9.0 — Automatizaciones y centro de actividad

**Qué puedes hacer ahora**
- La app recalcula tu progreso de metas y revisa tu agenda en segundo plano
  (cada hora en producción), sin enviarte notificaciones.
- En **Ajustes → Centro de actividad** ves qué se ejecutó y los cambios recientes,
  y puedes pulsar "Ejecutar ahora".
- Detecta sesiones incompletas, eventos duplicados y conflictos de horario, y sabe
  proponer un bloque de 3 h de DoorDash tras el gimnasio.

**Qué debes saber**
- El cron se protege con `CRON_SECRET`. Todo es silencioso: los resultados se ven
  dentro de la app, nunca como alarma.

---

## v0.8.0 — Gmail

**Qué puedes hacer ahora**
- En **Ajustes → Gmail**, conecta tu cuenta (solo lectura) y pulsa "Revisar correos".
- La app clasifica los correos y muestra los importantes en **Correos**.
- En el Inicio verás un aviso discreto si hay correos importantes pendientes.
- Marca "importante"/"no importante" para que aprenda tus preferencias por remitente.

**Qué debes saber**
- Acceso de **solo lectura**; nunca envía ni borra correos. **Sin notificaciones**.
- El scope `gmail.readonly` es restringido: en producción requiere verificación de
  Google (en modo prueba funciona para tu cuenta). Ver `DEPLOYMENT`.

---

## v0.7.0 — Importar horario por foto

**Qué puedes hacer ahora**
- En **Calendario → Importar horario**, toma una foto o elige una de la galería.
- La app extrae tu fila del horario y muestra una **vista previa**: puedes quitar
  lo que no aplique. Recién cuando pulsas **Confirmar** se crean los eventos.
- Los códigos AM/PM/OFF (y Utility) se convierten a tus horarios habituales; los
  días OFF quedan libres.

**Qué debes saber**
- Requiere `OPENAI_API_KEY` (modelo de visión). La imagen no se guarda: sólo se
  procesan los datos extraídos.
- Si un código o fecha no está claro, se marca para que tú decidas; nunca se inventa.

---

## v0.6.0 — Google Calendar

**Qué puedes hacer ahora**
- Ir a **Ajustes** y pulsar "Conectar Google Calendar". Se abre el consentimiento
  de Google; al aceptar, vuelves a la app ya conectado.
- Pulsar "Sincronizar ahora" para enviar los eventos de esta semana y la siguiente
  a tu Google Calendar. Se crean **sin recordatorios ni alarmas**, tal como pediste.
- "Desconectar" borra los tokens guardados.

**Qué debes saber**
- Requiere configurar credenciales de Google (Client ID/Secret y URL de redirección)
  y la clave de cifrado de tokens. Ver `DEPLOYMENT`/`.env.example`.
- La sincronización actual es **de subida** (app → Google). La importación desde
  Google y la resolución automática de conflictos vendrán en una iteración siguiente
  (la lógica de conflictos ya está escrita y probada).

---

## v0.5.0 — Asistente

**Qué puedes hacer ahora**
- Escribir en lenguaje natural, por ejemplo:
  - "Hoy hice 3 horas, gané 87.35 y recorrí 54.2 millas" → registra la sesión.
  - "¿Cuánto gané esta semana?" → resumen.
  - "Crea una meta de 4 entrenamientos semanales".
- Para borrar algo, el asistente **pide confirmación** con un botón Confirmar/Cancelar.

**Qué debes saber**
- Requiere `OPENAI_API_KEY`. El asistente sólo actúa mediante herramientas
  controladas; no accede directamente a la base de datos.

---

## v0.4.0 — PWA

- Instálala desde Safari con "Agregar a pantalla de inicio" (guía en la app).
- Si pierdes conexión mientras registras un delivery, se guarda y se envía solo
  al volver el internet. Verás un aviso cuando se sincronice.
- Cuando publiquemos una actualización, aparece "Nueva versión disponible".

---

## v0.3.0 — Metas y reportes

- Crea metas (ganancias, horas, millas, sesiones, entrenamientos, etc.).
- Cada meta muestra tu avance y si vas **en camino, atrasado, completado o excedido**.
- En Inicio verás cómo va la semana comparada con la anterior.

---

## v0.2.0 — Delivery

- Registro rápido pensado para el iPhone: "Gané $", horas/min, millas.
- Mientras escribes ves tu $/hora y $/milla.
- Estadísticas de la semana con tu mejor día y mejor zona.

---

## v0.1.0 — Fundaciones

- Inicio de sesión privado.
- Dashboard con la agenda de hoy y el resumen de la semana (desde el domingo).
- Tus datos sólo son visibles para ti.
