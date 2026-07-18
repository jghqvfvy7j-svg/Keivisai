import { getExercises } from "@/lib/data";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

// Render dinámico: siempre lee datos frescos de Supabase por petición.
export const dynamic = "force-dynamic";

// Server Component: obtiene los ejercicios de Supabase (o mock si no está
// configurado) y los pasa al componente cliente que hace el filtrado.
export default async function ExercisesPage() {
  const exercises = await getExercises();
  return <ExerciseLibrary exercises={exercises} />;
}
