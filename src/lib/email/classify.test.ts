import { describe, expect, it } from 'vitest';
import { classifyEmail } from './classify';
import { parseGmailMessage } from '@/lib/integrations/gmail';

describe('classifyEmail', () => {
  it('detecta seguridad como importante', () => {
    const c = classifyEmail({ sender: 'no-reply@github.com', subject: 'Verify your sign-in code' });
    expect(c.classification).toBe('seguridad');
    expect(c.requiresAttention).toBe(true);
    expect(c.importanceScore).toBeGreaterThanOrEqual(0.9);
  });

  it('detecta promociones como no importante', () => {
    const c = classifyEmail({ sender: 'deals@shop.com', subject: '50% off sale!', snippet: 'unsubscribe here' });
    expect(c.classification).toBe('promociones');
    expect(c.requiresAttention).toBe(false);
  });

  it('detecta facturas', () => {
    const c = classifyEmail({ sender: 'billing@acme.com', subject: 'Your invoice is ready' });
    expect(c.classification).toBe('facturas');
    expect(c.requiresAttention).toBe(true);
  });

  it('clasifica por dominio (vercel)', () => {
    const c = classifyEmail({ sender: 'notifications@vercel.com', subject: 'Deployment ready' });
    expect(c.classification).toBe('vercel');
  });

  it('feedback del usuario tiene prioridad (marcar no importante)', () => {
    const c = classifyEmail(
      { sender: 'alerts@github.com', subject: 'security code' },
      [{ match: 'github.com', important: false }],
    );
    expect(c.requiresAttention).toBe(false);
  });

  it('feedback del usuario puede marcar importante', () => {
    const c = classifyEmail(
      { sender: 'jefe@trabajo.com', subject: 'reunión' },
      [{ match: 'trabajo.com', important: true, classification: 'trabajo' }],
    );
    expect(c.classification).toBe('trabajo');
    expect(c.requiresAttention).toBe(true);
  });
});

describe('parseGmailMessage', () => {
  it('extrae remitente, asunto, fecha y snippet', () => {
    const p = parseGmailMessage({
      id: 'abc',
      snippet: 'Hola...',
      internalDate: '1752600000000',
      payload: {
        headers: [
          { name: 'From', value: 'Ana <ana@x.com>' },
          { name: 'Subject', value: 'Prueba' },
        ],
      },
    });
    expect(p.sender).toBe('Ana <ana@x.com>');
    expect(p.subject).toBe('Prueba');
    expect(p.snippet).toBe('Hola...');
    expect(p.receivedAt).toBe(new Date(1752600000000).toISOString());
  });
});
