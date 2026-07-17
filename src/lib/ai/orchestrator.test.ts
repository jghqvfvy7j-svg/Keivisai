import { describe, expect, it, vi } from 'vitest';
import { runAssistant, type LlmClient, type TranscriptItem } from './orchestrator';

const okValidate = (_n: string, a: unknown) => ({ ok: true, data: a });

/** LLM falso: primero pide una herramienta; cuando ve un tool_result, cierra con texto. */
function fakeLlm(toolName: string): LlmClient {
  return {
    async next(transcript: TranscriptItem[]) {
      const hasResult = transcript.some((t) => t.type === 'tool_result');
      if (!hasResult) {
        return { text: null, toolCalls: [{ id: 'c1', name: toolName, args: { x: 1 } }] };
      }
      return { text: 'Listo.', toolCalls: [] };
    },
  };
}

describe('orquestador: herramienta de solo lectura', () => {
  it('ejecuta la herramienta y devuelve texto final', async () => {
    const execute = vi.fn(async () => ({ data: 42 }));
    const r = await runAssistant(
      [{ type: 'message', role: 'user', text: '¿cuánto gané?' }],
      {
        llm: fakeLlm('get_week_delivery_summary'),
        tools: [],
        validate: okValidate,
        needsConfirmation: () => false,
        execute,
      },
    );
    expect(execute).toHaveBeenCalledOnce();
    expect(r.executed).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
    expect(r.text).toBe('Listo.');
  });
});

describe('orquestador: acción destructiva requiere confirmación', () => {
  it('no ejecuta; la deja pendiente', async () => {
    const execute = vi.fn(async () => ({ ok: true }));
    const r = await runAssistant(
      [{ type: 'message', role: 'user', text: 'borra el evento' }],
      {
        llm: fakeLlm('delete_calendar_event'),
        tools: [],
        validate: okValidate,
        needsConfirmation: (n) => n === 'delete_calendar_event',
        execute,
      },
    );
    expect(execute).not.toHaveBeenCalled();
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0].name).toBe('delete_calendar_event');
    expect(r.executed).toHaveLength(0);
  });
});

describe('orquestador: argumentos inválidos', () => {
  it('no ejecuta y continúa', async () => {
    const execute = vi.fn();
    const r = await runAssistant(
      [{ type: 'message', role: 'user', text: 'algo' }],
      {
        llm: fakeLlm('create_goal'),
        tools: [],
        validate: () => ({ ok: false, error: 'faltan campos' }),
        needsConfirmation: () => false,
        execute,
      },
    );
    expect(execute).not.toHaveBeenCalled();
    expect(r.executed).toHaveLength(0);
    expect(r.text).toBe('Listo.');
  });
});
