/**
 * Integración con Google Calendar.
 * - Funciones puras (mapeo de evento, expiración de token, resolución de
 *   conflictos): probadas con Vitest.
 * - Funciones de red (OAuth y llamadas a la API): escritas según la API oficial;
 *   requieren credenciales reales y se verifican al conectar.
 */

export interface LocalEvent {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  timezone?: string;
}

export interface GoogleEventBody {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: false; overrides: [] };
}

/** Convierte un evento local al cuerpo de Google, SIN recordatorios (spec §20). */
export function toGoogleEvent(e: LocalEvent, tz = 'America/New_York'): GoogleEventBody {
  const zone = e.timezone ?? tz;
  return {
    summary: e.title,
    ...(e.description ? { description: e.description } : {}),
    ...(e.location ? { location: e.location } : {}),
    start: { dateTime: e.startsAt, timeZone: zone },
    end: { dateTime: e.endsAt, timeZone: zone },
    reminders: { useDefault: false, overrides: [] },
  };
}

/** ¿Está vencido (o a punto) el access token? null => hay que reconectar/refrescar. */
export function isTokenExpired(
  expiresAtIso: string | null,
  now: number = Date.now(),
  skewSeconds = 60,
): boolean {
  if (!expiresAtIso) return true;
  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) return true;
  return exp - skewSeconds * 1000 <= now;
}

export type ConflictStrategy = 'latest' | 'local_wins' | 'remote_wins';

/**
 * Decide qué versión gana ante un conflicto de sincronización.
 * 'latest' (por defecto): la de marca de tiempo más reciente; empate => local.
 */
export function resolveConflict(
  localUpdatedIso: string,
  remoteUpdatedIso: string,
  strategy: ConflictStrategy = 'latest',
): 'local' | 'remote' {
  if (strategy === 'local_wins') return 'local';
  if (strategy === 'remote_wins') return 'remote';
  const local = new Date(localUpdatedIso).getTime();
  const remote = new Date(remoteUpdatedIso).getTime();
  return remote > local ? 'remote' : 'local';
}

// ---------------------------------------------------------------------------
// OAuth y llamadas a la API (red). Requieren credenciales reales.
// ---------------------------------------------------------------------------
export const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export type OAuthKind = 'calendar' | 'gmail';

export function encodeOAuthState(payload: { n: string; k: OAuthKind }): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeOAuthState(state: string): { n: string; k: OAuthKind } | null {
  try {
    const obj = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (obj && (obj.k === 'calendar' || obj.k === 'gmail') && typeof obj.n === 'string') return obj;
    return null;
  } catch {
    return null;
  }
}

export function googleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
}): string {
  const q = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: params.scopes.join(' '),
    state: params.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: params.refreshToken,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function insertGoogleEvent(params: {
  accessToken: string;
  calendarId: string;
  body: GoogleEventBody;
}): Promise<{ id: string }> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params.body),
    },
  );
  if (!res.ok) throw new Error(`Google insert ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function deleteGoogleEvent(params: {
  accessToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(params.calendarId)}/events/${params.eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${params.accessToken}` } },
  );
  if (!res.ok && res.status !== 410) throw new Error(`Google delete ${res.status}`);
}
