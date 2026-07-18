// Guardrails for user input sent to the AI. Blocks obvious prompt-injection,
// code/SQL payloads and off-topic abuse, so the coach stays a coach.

const BLOCK_PATTERNS: RegExp[] = [
  // SQL
  /\b(drop|delete|truncate|alter|update|insert)\s+(table|into|from|database)\b/i,
  /\bunion\s+select\b/i,
  /;\s*(drop|delete|update|insert)\b/i,
  // code execution / shells
  /\b(rm\s+-rf|sudo\s|chmod\s|curl\s+http|wget\s+http)\b/i,
  /<script[\s>]/i,
  /\b(eval|exec)\s*\(/i,
  /\bimport\s+os\b|\bsubprocess\b|\brequire\(['"]child_process/i,
  // prompt injection
  /ignore (all |the )?(previous|above|prior) (instructions|prompts)/i,
  /you are now|forget (your|all) (instructions|rules)/i,
  /reveal (your )?(system )?prompt|show me your instructions/i,
  /\bDAN\b.*\bmode\b/i,
];

export type GuardResult = { ok: true } | { ok: false; reason: string };

export function guardUserMessage(text: string): GuardResult {
  const t = (text || "").trim();
  if (!t) return { ok: false, reason: "empty" };
  if (t.length > 2000) return { ok: false, reason: "too_long" };
  for (const re of BLOCK_PATTERNS) {
    if (re.test(t)) return { ok: false, reason: "blocked" };
  }
  return { ok: true };
}

export const GUARD_REPLY =
  "I'm your fitness coach, so I'll keep us focused on training, nutrition and recovery. " +
  "I can't run code, execute database commands, or step outside that role — but ask me anything about your workouts, meals or progress and I'm all in. 💪";
