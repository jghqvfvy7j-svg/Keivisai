import { describe, expect, it } from 'vitest';
import {
  TOOLS,
  getTool,
  requiresConfirmation,
  riskOf,
  toolDefsForOpenAI,
  validateToolArgs,
} from './tools';

describe('registro de herramientas', () => {
  it('cada herramienta tiene nombre, descripción, riesgo y handler', () => {
    for (const t of TOOLS) {
      expect(t.name).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(5);
      expect(['none', 'recommended', 'required']).toContain(t.risk);
      expect(typeof t.handler).toBe('function');
    }
  });

  it('las herramientas de borrado exigen confirmación', () => {
    expect(requiresConfirmation('delete_calendar_event')).toBe(true);
    expect(requiresConfirmation('delete_delivery_session')).toBe(true);
  });

  it('las lecturas no exigen confirmación', () => {
    expect(riskOf('get_today_schedule')).toBe('none');
    expect(requiresConfirmation('get_today_schedule')).toBe(false);
    expect(requiresConfirmation('get_week_delivery_summary')).toBe(false);
  });

  it('herramienta desconocida => sin riesgo', () => {
    expect(riskOf('no_existe')).toBeNull();
  });
});

describe('validación de argumentos', () => {
  it('acepta argumentos válidos', () => {
    const r = validateToolArgs('create_delivery_session', { earnings: 87.35, durationMinutes: 180, miles: 54.2 });
    expect(r.ok).toBe(true);
  });

  it('rechaza ganancia negativa', () => {
    const r = validateToolArgs('create_delivery_session', { earnings: -5 });
    expect(r.ok).toBe(false);
  });

  it('rechaza eventId no-uuid', () => {
    expect(validateToolArgs('delete_calendar_event', { eventId: 'abc' }).ok).toBe(false);
  });

  it('herramienta desconocida => error', () => {
    expect(validateToolArgs('no_existe', {}).ok).toBe(false);
  });
});

describe('definiciones para OpenAI', () => {
  it('genera function tools con parámetros JSON Schema', () => {
    const defs = toolDefsForOpenAI();
    expect(defs.length).toBe(TOOLS.length);
    const t = defs.find((d) => d.name === 'create_delivery_session');
    expect(t?.type).toBe('function');
    expect(t?.parameters).toHaveProperty('properties');
  });

  it('getTool devuelve la herramienta por nombre', () => {
    expect(getTool('create_goal')?.name).toBe('create_goal');
  });
});
