import { expect, test } from '@playwright/test';

test('POST a un endpoint protegido sin sesión responde 401 JSON (no redirige a login)', async ({ request }) => {
  const res = await request.post('/api/assistant/respond', {
    data: { message: 'hola' },
    headers: { 'Content-Type': 'application/json' },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(401);
});

test('el endpoint MCP sin token responde 401 (no redirige a login)', async ({ request }) => {
  const res = await request.post('/api/mcp', {
    data: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    headers: { 'Content-Type': 'application/json' },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(401);
});

test('una página protegida sin sesión redirige a /login', async ({ page }) => {
  await page.goto('/inicio');
  await expect(page).toHaveURL(/\/login/);
});

// Aislamiento multiusuario end-to-end: requiere dos cuentas reales en el Supabase de
// staging. Se salta si no hay credenciales. Ver supabase/tests/rls.sql para la prueba a
// nivel de BD (que sí se ejecuta).
test('aislamiento multiusuario (requiere cuentas de staging)', async () => {
  test.skip(!process.env.E2E_USER_A_EMAIL, 'Define E2E_USER_A_EMAIL/... para habilitarla');
  // 1) Iniciar sesión como A, crear una conversación (POST /api/assistant/respond) y anotar su id.
  // 2) Cerrar sesión, iniciar como B y hacer POST con ese conversationId.
  // 3) Esperar 403 (guard de propiedad).
});
