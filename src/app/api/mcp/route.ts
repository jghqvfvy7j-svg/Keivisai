import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTool, TOOLS, validateToolArgs } from '@/lib/ai/tools';
import { handleMcpRequest, type JsonRpcRequest } from '@/lib/mcp/dispatch';
import { hashToken } from '@/lib/mcp/tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Sólo herramientas no destructivas se exponen por MCP (spec §31).
// Las acciones destructivas requieren confirmación y no están disponibles aquí.
const AVAILABLE = new Set(TOOLS.filter((t) => t.risk === 'none').map((t) => t.name));

async function authenticate(req: Request): Promise<{ userId: string } | null> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from('mcp_tokens')
    .select('id,user_id,revoked_at,expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
  await admin.from('mcp_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { userId: data.user_id };
}

export async function POST(req: Request) {
  const authed = await authenticate(req);
  if (!authed) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'No autorizado' } },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    );
  }

  const body = (await req.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body || body.jsonrpc !== '2.0' || !body.method) {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Solicitud inválida' } }, { status: 400 });
  }

  const rl = checkRateLimit(`mcp:${authed.userId}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32005, message: 'Demasiadas solicitudes' } }, { status: 429 });
  }

  const admin = createAdminClient();
  const ctx = { userId: authed.userId, supabase: admin };

  const response = await handleMcpRequest(body, {
    serverInfo: { name: 'keivis-assistant-mcp', version: '1.0.0' },
    listTools: () =>
      TOOLS.filter((t) => AVAILABLE.has(t.name)).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: zodToJsonSchema(t.schema, { target: 'openApi3' }),
      })),
    isAvailable: (name) => AVAILABLE.has(name),
    validate: validateToolArgs,
    callTool: async (name, args) => {
      const tool = getTool(name);
      if (!tool) throw new Error(`Herramienta desconocida: ${name}`);
      const result = await tool.handler(ctx, args as never);
      await admin.from('audit_logs').insert({
        user_id: authed.userId,
        actor_type: 'mcp',
        action: `tool.${name}`,
        after_data: (args ?? {}) as object,
      });
      return result;
    },
  });

  if (response === null) return new Response(null, { status: 202 });
  return NextResponse.json(response);
}

export function GET() {
  return NextResponse.json({
    server: 'keivis-assistant-mcp',
    transport: 'json-rpc over HTTP POST',
    note: 'Envía solicitudes JSON-RPC 2.0 por POST con Authorization: Bearer <token>.',
  });
}
