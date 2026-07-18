import { z } from "zod";

// Strong password policy: 8+ chars with upper, lower and a number.
const strongPassword = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Enter your name"),
    email: z.string().email("Enter a valid email"),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

// Live strength meter used by the signup UI (0-4).
export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 12) score++;
  const label = ["Too weak", "Weak", "Fair", "Strong", "Excellent"][score];
  return { score, label };
}

export const onboardingSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  age: z.coerce.number().min(10).max(100).optional(),
  gender: z.enum(["masculino", "femenino", "otro", "prefiero_no_decir"]).optional(),
  height_cm: z.coerce.number().min(100).max(230).optional(),
  current_weight_kg: z.coerce.number().min(30).max(300).optional(),
  goal: z.enum([
    "ganar_masa_muscular",
    "perder_grasa",
    "tonificar",
    "aumentar_fuerza",
    "mejorar_salud",
    "recomposicion",
  ]),
  level: z.enum(["principiante", "intermedio", "avanzado"]),
  training_days: z.coerce.number().min(1).max(7),
  session_duration_minutes: z.coerce.number().min(15).max(180),
  injuries: z.string().optional(),
  equipment_available: z.array(z.string()).min(1, "Select at least one option"),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
