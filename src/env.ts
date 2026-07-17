/**
 * Validación de variables de entorno con Zod.
 * - Se ejecuta al arrancar. Si falta algo, el proceso falla con un mensaje claro.
 * - `serverEnv` NUNCA debe importarse desde componentes de cliente.
 * - Solo las variables NEXT_PUBLIC_* llegan al navegador (`clientEnv`).
 */
import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_DEFAULT: z.string().min(1),
  OPENAI_MODEL_FAST: z.string().min(1),
  OPENAI_MODEL_VISION: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  // 32 bytes en base64 => 44 chars aprox. Se valida el tamaño al decodificar.
  GOOGLE_TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, {
      message: "GOOGLE_TOKEN_ENCRYPTION_KEY debe ser 32 bytes en base64",
    }),

  CRON_SECRET: z.string().min(1),
  INTERNAL_API_SECRET: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().optional().default(""),
});

function format(error: z.ZodError): never {
  const issues = error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Variables de entorno inválidas:\n${issues}`);
}

/**
 * clientEnv NO lanza al importar: durante el build de Next (fase "collect page
 * data") los módulos de ruta se importan sin que las variables estén presentes,
 * y un throw aquí rompería el build. Si la validación falla, se cae a los valores
 * crudos (posiblemente vacíos) y se avisa; la app fallará de forma clara en runtime
 * si de verdad faltan. La validación ESTRICTA del servidor sigue en getServerEnv().
 */
export const clientEnv = (() => {
  const raw = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
  const parsed = clientSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (typeof window !== "undefined") {
    // Solo en el navegador en runtime: avisar sin romper.
    console.warn("Variables NEXT_PUBLIC_* inválidas o ausentes:", parsed.error.flatten().fieldErrors);
  }
  return raw;
})();

/** Validación estricta opcional del entorno de cliente (llamar en runtime, no en build). */
export function assertClientEnv() {
  const parsed = clientSchema.safeParse(clientEnv);
  if (!parsed.success) format(parsed.error);
  return parsed.data;
}

/** Llamar solo en servidor (route handlers, server components, edge). */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() no puede usarse en el navegador");
  }
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) format(parsed.error);
  return parsed.data;
}
