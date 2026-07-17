/** Clasificación de correos (pura y testeable). No lee cuerpos completos. */

export type EmailCategory =
  | 'trabajo' | 'horario' | 'finanzas' | 'seguridad' | 'desarrollo'
  | 'vercel' | 'supabase' | 'google' | 'openai' | 'facturas'
  | 'promociones' | 'personal' | 'otro';

export interface EmailInput {
  sender: string; // "Nombre <correo@dominio>" o "correo@dominio"
  subject: string;
  snippet?: string;
}

/** Regla aprendida del feedback del usuario (por dominio o remitente). */
export interface UserRule {
  match: string; // subcadena en minúsculas (dominio o correo)
  classification?: EmailCategory;
  important?: boolean;
}

export interface Classification {
  classification: EmailCategory;
  importanceScore: number; // 0..1
  requiresAttention: boolean;
}

function senderDomain(sender: string): string {
  const m = sender.toLowerCase().match(/@([a-z0-9.-]+)/);
  return m ? m[1] : '';
}

const DOMAIN_RULES: { test: (d: string) => boolean; cat: EmailCategory; score: number }[] = [
  { test: (d) => d.includes('vercel.com'), cat: 'vercel', score: 0.6 },
  { test: (d) => d.includes('supabase.'), cat: 'supabase', score: 0.6 },
  { test: (d) => d.includes('openai.com'), cat: 'openai', score: 0.6 },
  { test: (d) => d.includes('github.com'), cat: 'desarrollo', score: 0.55 },
  { test: (d) => d.includes('google.com') || d.includes('accounts.google'), cat: 'google', score: 0.5 },
];

const KEYWORDS: { words: string[]; cat: EmailCategory; score: number }[] = [
  { words: ['security alert', 'verify', 'verificación', 'código', 'code', 'sign-in', 'inicio de sesión', 'password', 'contraseña', '2fa'], cat: 'seguridad', score: 0.9 },
  { words: ['invoice', 'receipt', 'factura', 'recibo', 'payment', 'pago', 'statement', 'billing'], cat: 'facturas', score: 0.7 },
  { words: ['shift', 'schedule', 'horario', 'turno'], cat: 'horario', score: 0.7 },
  { words: ['unsubscribe', 'sale', '% off', 'descuento', 'newsletter', 'promo', 'deal', 'oferta'], cat: 'promociones', score: 0.15 },
];

export function classifyEmail(email: EmailInput, userRules: UserRule[] = []): Classification {
  const domain = senderDomain(email.sender);
  const haystack = `${email.subject} ${email.snippet ?? ''}`.toLowerCase();

  let classification: EmailCategory = 'otro';
  let score = 0.4;

  // 1) Dominio conocido
  for (const r of DOMAIN_RULES) {
    if (r.test(domain)) {
      classification = r.cat;
      score = r.score;
      break;
    }
  }

  // 2) Palabras clave (seguridad manda; promociones degradan)
  for (const k of KEYWORDS) {
    if (k.words.some((w) => haystack.includes(w))) {
      // seguridad y facturas sobrescriben; promociones sólo si no es ya seguridad
      if (k.cat === 'seguridad' || k.cat === 'facturas' || classification === 'otro' || k.cat === 'promociones') {
        if (!(k.cat === 'promociones' && classification === 'seguridad')) {
          classification = k.cat;
          score = k.score;
        }
      }
      if (k.cat === 'seguridad') break;
    }
  }

  // 3) Feedback del usuario (máxima prioridad)
  const rule = userRules.find((u) => domain.includes(u.match) || email.sender.toLowerCase().includes(u.match));
  let forcedAttention: boolean | null = null;
  if (rule) {
    if (rule.classification) classification = rule.classification;
    if (rule.important === true) {
      score = Math.max(score, 0.85);
      forcedAttention = true;
    } else if (rule.important === false) {
      score = Math.min(score, 0.2);
      forcedAttention = false;
    }
  }

  const requiresAttention =
    forcedAttention != null ? forcedAttention : classification !== 'promociones' && score >= 0.6;

  return { classification, importanceScore: Math.round(score * 100) / 100, requiresAttention };
}
