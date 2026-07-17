import { describe, expect, it, vi } from 'vitest';
import { generateMcpToken, hashToken } from './tokens';
import { handleMcpRequest, type McpDeps } from './dispatch';

describe('tokens MCP', () => {
  it('genera token con prefijo mcp_ y hash de 64 hex', () => {
    const t = generateMcpToken();
    expect(t.plaintext.startsWith('mcp_')).toBe(true);
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(t.prefix).toBe(t.plaintext.slice(0, 12));
  });
  it('hashToken es determinista y distinto por token', () => {
    expect(hashToken('a')).toBe(hashToken('a'));
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

function deps(overrides: Partial<McpDeps> = {}): McpDeps {
  return {
    serverInfo: { name: 'keivis-mcp', version: '1.0.0' },
    listTools: () => [{ name: 'get_today_schedule', description: 'x', inputSchema: {} }],
    isAvailable: (n) => n === 'get_today_schedule',
    validate: (_n, a) => ({ ok: true, data: a }),
    callTool: vi.fn(async () => ({ events: [] })),
    ...overrides,
  };
}

describe('dispatcher MCP', () => {
  it('initialize devuelve serverInfo', async () => {
    const r = await handleMcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' }, deps());
    expect(r?.result).toMatchObject({ serverInfo: { name: 'keivis-mcp' } });
  });

  it('tools/list lista herramientas', async () => {
    const r = await handleMcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, deps());
    expect((r?.result as { tools: unknown[] }).tools).toHaveLength(1);
  });

  it('tools/call ejecuta herramienta disponible', async () => {
    const call = vi.fn(async () => ({ events: [1] }));
    const r = await handleMcpRequest(
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_today_schedule', arguments: {} } },
      deps({ callTool: call }),
    );
    expect(call).toHaveBeenCalledOnce();
    expect((r?.result as { isError: boolean }).isError).toBe(false);
  });

  it('tools/call rechaza herramienta no disponible (p. ej. destructiva)', async () => {
    const r = await handleMcpRequest(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'delete_calendar_event', arguments: {} } },
      deps(),
    );
    expect(r?.error?.code).toBe(-32601);
  });

  it('tools/call con argumentos inválidos => error', async () => {
    const r = await handleMcpRequest(
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'get_today_schedule', arguments: {} } },
      deps({ validate: () => ({ ok: false, error: 'malo' }) }),
    );
    expect(r?.error?.code).toBe(-32602);
  });

  it('notificación initialized no devuelve respuesta', async () => {
    const r = await handleMcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, deps());
    expect(r).toBeNull();
  });

  it('método desconocido => error', async () => {
    const r = await handleMcpRequest({ jsonrpc: '2.0', id: 6, method: 'foo/bar' }, deps());
    expect(r?.error?.code).toBe(-32601);
  });
});
