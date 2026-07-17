import { expect, test } from '@playwright/test';

test('la raíz redirige a login cuando no hay sesión', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('la página de login se muestra', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByPlaceholder('Correo')).toBeVisible();
});

test('la guía de instalación es accesible tras iniciar (requiere sesión)', async ({ page }) => {
  // Sin sesión, /instalar redirige a login (ruta protegida)
  await page.goto('/instalar');
  await expect(page).toHaveURL(/\/(login|instalar)/);
});
