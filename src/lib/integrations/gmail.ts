/**
 * Integración con Gmail (acceso mínimo).
 * - `parseGmailMessage`: puro y probado (extrae remitente/asunto/fecha/snippet).
 * - Llamadas a la API: aisladas; requieren credenciales reales.
 */

export interface GmailHeader {
  name: string;
  value: string;
}
export interface GmailMessageRaw {
  id: string;
  snippet?: string;
  internalDate?: string; // ms epoch como string
  payload?: { headers?: GmailHeader[] };
}
export interface ParsedEmail {
  id: string;
  sender: string;
  subject: string;
  receivedAt: string | null; // ISO
  snippet: string;
}

function header(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

export function parseGmailMessage(raw: GmailMessageRaw): ParsedEmail {
  const headers = raw.payload?.headers;
  let receivedAt: string | null = null;
  if (raw.internalDate && /^\d+$/.test(raw.internalDate)) {
    receivedAt = new Date(Number(raw.internalDate)).toISOString();
  } else {
    const dateHeader = header(headers, 'Date');
    const d = dateHeader ? new Date(dateHeader) : null;
    receivedAt = d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  }
  return {
    id: raw.id,
    sender: header(headers, 'From'),
    subject: header(headers, 'Subject'),
    receivedAt,
    snippet: raw.snippet ?? '',
  };
}

// --- API (red) -------------------------------------------------------------
export async function listRecentMessageIds(params: {
  accessToken: string;
  maxResults?: number;
  query?: string;
}): Promise<string[]> {
  const q = new URLSearchParams({
    maxResults: String(params.maxResults ?? 20),
    q: params.query ?? 'newer_than:7d -category:promotions',
  });
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${q}`, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail list ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { messages?: { id: string }[] };
  return (data.messages ?? []).map((m) => m.id);
}

export async function getMessage(params: {
  accessToken: string;
  id: string;
}): Promise<GmailMessageRaw> {
  const q = new URLSearchParams({
    format: 'metadata',
    metadataHeaders: 'From',
  });
  // Pedimos también Subject y Date como metadata headers
  q.append('metadataHeaders', 'Subject');
  q.append('metadataHeaders', 'Date');
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.id}?${q}`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } },
  );
  if (!res.ok) throw new Error(`Gmail get ${res.status}`);
  return res.json();
}
