import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated redirect', async ({ page }) => {
    // Protected pages should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('signup page accessible', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/signup/);
  });
});
