# Apple Health — Importar datos a tu perfil

Permite que los usuarios importen su frecuencia cardíaca, distancia y
entrenamientos de Apple Health / Apple Watch a la web.

## Instalación (una vez)

1. Supabase → SQL Editor → ejecuta `health_data.sql`.
   Crea dos tablas con seguridad por usuario (RLS):
   - `health_workouts` — entrenamientos (tipo, distancia, calorías, FC).
   - `health_heart_daily` — resumen diario de frecuencia cardíaca.

## Cómo lo usa el usuario (desde la app)

En la página **Body** aparece la tarjeta "Apple Health":
1. En el iPhone: app **Health** → foto de perfil → **Export All Health Data**.
2. Se genera un archivo **.zip** → guardarlo en Archivos.
3. En la app web: tocar **Upload Health export (.zip)** y elegir ese archivo.
4. La app lee el archivo en el navegador, extrae `export.xml`, y envía los datos.
5. Se muestran la frecuencia cardíaca en reposo y los entrenamientos importados.

## Notas técnicas

- El archivo se procesa en el navegador (se extrae el zip) y solo se envía el XML.
- Los duplicados se evitan con un id único por entrenamiento.
- Es importación **bajo demanda** (no en tiempo real). Para datos en vivo del
  Apple Watch se necesitaría una app nativa de iOS (futuro).
- Los datos son privados por usuario gracias a RLS.
