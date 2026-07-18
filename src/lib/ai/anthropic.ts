// Thin wrapper around the Anthropic Messages API with tool-use support.
// Server-side only. Never import into client components.

type Content = string | unknown[];
export type AiMessage = { role: "user" | "assistant"; content: Content };
export type AiTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Sleep helper for backoff. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An API failure we know the shape of. `retryable` drives the backoff loop. */
class AnthropicError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, retryable: boolean) {
    // The response body can echo parts of the request, so it never travels in
    // the message. Only the status code does.
    super(`ANTHROPIC_${status}`);
    this.name = "AnthropicError";
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * 429 = rate limited. 529 = Anthropic overloaded. 5xx = transient.
 * A 400 or 401 will fail identically on a retry, so we never waste capacity
 * (or the user's time) repeating it.
 */
function isRetryableStatus(status: number) {
  return status === 429 || status === 529 || (status >= 500 && status < 600);
}

export async function callAnthropic(opts: {
  system: string;
  messages: AiMessage[];
  tools?: AiTool[];
  maxTokens?: number;
  /** Extra attempts after the first, when overloaded or rate limited. */
  retries?: number;
  /** Abandon a single attempt after this many ms. */
  timeoutMs?: number;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");

  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // A hung request would otherwise hold a serverless function open until
    // Vercel kills it, burning a concurrency slot for nothing.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let retryable = false;
    let retryAfterMs: number | null = null;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: opts.maxTokens ?? 900,
          system: opts.system,
          messages: opts.messages,
          ...(opts.tools ? { tools: opts.tools } : {}),
        }),
      });

      if (res.ok) return await res.json();

      retryable = isRetryableStatus(res.status);
      const header = Number(res.headers.get("retry-after"));
      if (Number.isFinite(header) && header > 0) retryAfterMs = header * 1000;
      lastError = new AnthropicError(res.status, retryable);
    } catch (err) {
      // Timeouts and network failures are transient by nature: worth one more go.
      lastError = err;
      retryable = true;
    } finally {
      clearTimeout(timer);
    }

    if (!retryable || attempt === retries) throw lastError;

    // Honour Retry-After when given. Otherwise exponential backoff. The jitter
    // matters: without it every queued request wakes at the same instant and
    // stampedes the API a second time.
    const backoff = retryAfterMs ?? 500 * 2 ** attempt;
    await sleep(backoff + Math.random() * 250);
  }

  throw lastError ?? new Error("ANTHROPIC_FAILED");
}

// Extract plain text from a response content array.
export function extractText(content: unknown[]): string {
  return content
    .filter((b): b is { type: "text"; text: string } => {
      const bb = b as { type?: string };
      return bb.type === "text";
    })
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Extract the first tool_use block (if any).
export function extractToolUse(content: unknown[]) {
  return content.find((b) => {
    const bb = b as { type?: string };
    return bb.type === "tool_use";
  }) as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } | undefined;
}

// Safety net: remove markdown/formatting symbols so the coach always reads like
// a plain human text, even if the model slips and adds bold, bullets or dashes.
export function stripFormatting(text: string): string {
  return text
    // bold/italic asterisks and underscores around words
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    // headers at line start (#, ##, ###)
    .replace(/^#{1,6}\s+/gm, "")
    // bullet points at line start (-, *, •)
    .replace(/^\s*[-*•]\s+/gm, "")
    // numbered list markers at line start (1. 2. etc.)
    .replace(/^\s*\d+\.\s+/gm, "")
    // backticks
    .replace(/`/g, "")
    // em-dashes and double hyphens to a comma or spaced text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s--\s/g, ", ")
    // collapse 3+ newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

/** One piece of a streamed response. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "done" };

/**
 * Opens a streaming request, retrying only while nothing has been sent yet.
 * Once bytes are flowing a retry would duplicate text, so we never retry then.
 */
async function openStream(opts: {
  system: string;
  messages: AiMessage[];
  tools?: AiTool[];
  maxTokens?: number;
  retries?: number;
  timeoutMs?: number;
}): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");

  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // Guards only the time to first byte. The stream itself may run longer.
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let retryable = false;
    let retryAfterMs: number | null = null;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: opts.maxTokens ?? 900,
          system: opts.system,
          messages: opts.messages,
          stream: true,
          ...(opts.tools ? { tools: opts.tools } : {}),
        }),
      });

      clearTimeout(timer);
      if (res.ok && res.body) return res;

      retryable = isRetryableStatus(res.status);
      const header = Number(res.headers.get("retry-after"));
      if (Number.isFinite(header) && header > 0) retryAfterMs = header * 1000;
      lastError = new AnthropicError(res.status, retryable);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      retryable = true;
    }

    if (!retryable || attempt === retries) throw lastError;
    await sleep((retryAfterMs ?? 500 * 2 ** attempt) + Math.random() * 250);
  }

  throw lastError ?? new Error("ANTHROPIC_FAILED");
}

/**
 * Yields text as the model produces it, plus any tool call it decides to make.
 *
 * Anthropic sends Server-Sent Events. We only care about a few of them:
 *  - content_block_start with a tool_use block  -> a tool call is beginning
 *  - content_block_delta / text_delta           -> more words for the user
 *  - content_block_delta / input_json_delta     -> more of the tool's arguments
 *  - content_block_stop                         -> that block is complete
 */
export async function* streamAnthropic(opts: {
  system: string;
  messages: AiMessage[];
  tools?: AiTool[];
  maxTokens?: number;
}): AsyncGenerator<StreamEvent> {
  const res = await openStream(opts);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let toolId = "";
  let toolName = "";
  let toolJson = "";
  let inTool = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;

      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue; // a malformed frame is not worth killing the answer for
      }

      const type = evt.type as string;

      if (type === "content_block_start") {
        const block = evt.content_block as { type?: string; id?: string; name?: string } | undefined;
        if (block?.type === "tool_use") {
          inTool = true;
          toolId = block.id ?? "";
          toolName = block.name ?? "";
          toolJson = "";
        }
      } else if (type === "content_block_delta") {
        const delta = evt.delta as { type?: string; text?: string; partial_json?: string } | undefined;
        if (delta?.type === "text_delta" && delta.text) {
          yield { type: "text", text: delta.text };
        } else if (delta?.type === "input_json_delta" && delta.partial_json) {
          toolJson += delta.partial_json;
        }
      } else if (type === "content_block_stop") {
        if (inTool) {
          inTool = false;
          let input: unknown = {};
          try {
            input = toolJson ? JSON.parse(toolJson) : {};
          } catch {
            input = {};
          }
          yield { type: "tool_use", id: toolId, name: toolName, input };
        }
      } else if (type === "error") {
        // The API can report an overload mid-stream.
        throw new Error("ANTHROPIC_STREAM_ERROR");
      }
    }
  }

  yield { type: "done" };
}
