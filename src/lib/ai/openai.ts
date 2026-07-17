import 'server-only';
import { getServerEnv } from '@/env';
import type { LlmClient, LlmTurn, TranscriptItem } from './orchestrator';

/**
 * LlmClient sobre la API de OpenAI Responses.
 * Nota: escrito según la forma documentada de /v1/responses (function tools con
 * function_call / function_call_output). Verifica contra tu cuenta al conectar
 * la clave real; el resto del sistema no depende de detalles internos de esta capa.
 */
function toInput(transcript: TranscriptItem[]): unknown[] {
  return transcript.map((item) => {
    if (item.type === 'message') {
      return { role: item.role, content: item.text };
    }
    if (item.type === 'tool_call') {
      return {
        type: 'function_call',
        call_id: item.id,
        name: item.name,
        arguments: JSON.stringify(item.args ?? {}),
      };
    }
    // tool_result
    return {
      type: 'function_call_output',
      call_id: item.id,
      output: JSON.stringify(item.result ?? {}),
    };
  });
}

interface ResponsesOutputItem {
  type: string;
  content?: { type: string; text?: string }[];
  call_id?: string;
  name?: string;
  arguments?: string;
}

export function createOpenAiClient(): LlmClient {
  const env = getServerEnv();
  return {
    async next(transcript, tools): Promise<LlmTurn> {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL_DEFAULT,
          input: toInput(transcript),
          tools,
          tool_choice: 'auto',
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
      }
      const data = (await res.json()) as { output?: ResponsesOutputItem[] };
      const output = data.output ?? [];

      let text: string | null = null;
      const toolCalls: LlmTurn['toolCalls'] = [];
      for (const item of output) {
        if (item.type === 'message' && item.content) {
          const t = item.content
            .filter((c) => c.type === 'output_text' && c.text)
            .map((c) => c.text as string)
            .join('');
          if (t) text = (text ?? '') + t;
        } else if (item.type === 'function_call' && item.call_id && item.name) {
          let args: unknown = {};
          try {
            args = JSON.parse(item.arguments ?? '{}');
          } catch {
            args = {};
          }
          toolCalls.push({ id: item.call_id, name: item.name, args });
        }
      }
      return { text, toolCalls };
    },
  };
}
