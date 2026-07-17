/**
 * Orquestador del asistente: ejecuta el bucle de tool-calling.
 * Recibe un `LlmClient` por inyección de dependencias, así que la lógica del
 * bucle se prueba sin llamar a OpenAI. Las acciones que requieren confirmación
 * NO se ejecutan aquí: se devuelven como `pending` para que el usuario confirme.
 */

export type TranscriptItem =
  | { type: 'message'; role: 'system' | 'user' | 'assistant'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  | { type: 'tool_result'; id: string; name: string; result: unknown };

export interface LlmTurn {
  text: string | null;
  toolCalls: { id: string; name: string; args: unknown }[];
}

export interface LlmClient {
  next(transcript: TranscriptItem[], tools: unknown[]): Promise<LlmTurn>;
}

export interface RunDeps {
  llm: LlmClient;
  tools: unknown[];
  validate: (name: string, args: unknown) => { ok: boolean; data?: unknown; error?: string };
  needsConfirmation: (name: string) => boolean;
  execute: (name: string, args: unknown) => Promise<unknown>;
  maxSteps?: number;
}

export interface ExecutedAction {
  name: string;
  args: unknown;
  result: unknown;
}
export interface PendingAction {
  name: string;
  args: unknown;
}
export interface RunResult {
  text: string;
  executed: ExecutedAction[];
  pending: PendingAction[];
  transcript: TranscriptItem[];
}

export async function runAssistant(
  initial: TranscriptItem[],
  deps: RunDeps,
): Promise<RunResult> {
  const transcript = [...initial];
  const executed: ExecutedAction[] = [];
  const pending: PendingAction[] = [];
  const maxSteps = deps.maxSteps ?? 4;
  let finalText = '';

  for (let step = 0; step < maxSteps; step++) {
    const turn = await deps.llm.next(transcript, deps.tools);

    if (turn.text) {
      finalText = turn.text;
      transcript.push({ type: 'message', role: 'assistant', text: turn.text });
    }

    if (turn.toolCalls.length === 0) {
      return { text: finalText, executed, pending, transcript };
    }

    for (const call of turn.toolCalls) {
      transcript.push({ type: 'tool_call', id: call.id, name: call.name, args: call.args });

      const v = deps.validate(call.name, call.args);
      if (!v.ok) {
        transcript.push({ type: 'tool_result', id: call.id, name: call.name, result: { error: v.error } });
        continue;
      }

      if (deps.needsConfirmation(call.name)) {
        pending.push({ name: call.name, args: v.data });
        transcript.push({
          type: 'tool_result',
          id: call.id,
          name: call.name,
          result: { status: 'pendiente_de_confirmacion' },
        });
        continue;
      }

      try {
        const result = await deps.execute(call.name, v.data);
        executed.push({ name: call.name, args: v.data, result });
        transcript.push({ type: 'tool_result', id: call.id, name: call.name, result });
      } catch (e) {
        transcript.push({
          type: 'tool_result',
          id: call.id,
          name: call.name,
          result: { error: e instanceof Error ? e.message : 'error' },
        });
      }
    }

    // Si sólo hay acciones que requieren confirmación, detenemos para pedirla.
    if (pending.length > 0 && executed.length === 0) {
      return {
        text: finalText || 'Necesito tu confirmación para continuar.',
        executed,
        pending,
        transcript,
      };
    }
  }

  return { text: finalText, executed, pending, transcript };
}
