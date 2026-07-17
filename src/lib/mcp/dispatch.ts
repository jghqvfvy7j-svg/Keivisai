/**
 * Dispatcher MCP (JSON-RPC 2.0) con inyección de dependencias.
 * Cubre initialize / tools/list / tools/call. Se prueba sin red ni BD.
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: { name?: string; arguments?: unknown } & Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface McpDeps {
  serverInfo: { name: string; version: string };
  listTools: () => McpToolDef[];
  isAvailable: (name: string) => boolean;
  validate: (name: string, args: unknown) => { ok: boolean; data?: unknown; error?: string };
  callTool: (name: string, args: unknown) => Promise<unknown>;
}

const ok = (id: JsonRpcResponse['id'], result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result });
const fail = (id: JsonRpcResponse['id'], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: '2.0', id, error: { code, message },
});

/** Devuelve null para notificaciones (mensajes sin id que no esperan respuesta). */
export async function handleMcpRequest(
  req: JsonRpcRequest,
  deps: McpDeps,
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  switch (req.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: deps.serverInfo,
      });

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

    case 'ping':
      return ok(id, {});

    case 'tools/list':
      return ok(id, { tools: deps.listTools() });

    case 'tools/call': {
      const name = req.params?.name;
      const args = req.params?.arguments ?? {};
      if (!name || !deps.isAvailable(name)) {
        return fail(id, -32601, `Herramienta no disponible por MCP: ${name ?? '(vacío)'}`);
      }
      const v = deps.validate(name, args);
      if (!v.ok) return fail(id, -32602, `Argumentos inválidos: ${v.error}`);
      try {
        const result = await deps.callTool(name, v.data);
        return ok(id, { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false });
      } catch (e) {
        return ok(id, {
          content: [{ type: 'text', text: e instanceof Error ? e.message : 'error' }],
          isError: true,
        });
      }
    }

    default:
      return fail(id, -32601, `Método no soportado: ${req.method}`);
  }
}
