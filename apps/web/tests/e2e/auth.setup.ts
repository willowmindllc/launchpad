import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Programmatic login via the UI.
 * Requires E2E_USER_EMAIL and E2E_USER_PASSWORD env vars.
 *
 * Usage:
 *   E2E_USER_EMAIL=test@example.com E2E_USER_PASSWORD=secret BASE_URL=https://launchpad.willowmindllc.tech npx playwright test
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    console.log('⚠️  E2E_USER_EMAIL / E2E_USER_PASSWORD not set — skipping auth setup');
    console.log('   Authenticated tests will be skipped.');
    // Create empty storage state so dependent tests can still load
    await page.goto('/login');
    await page.context().storageState({ path: authFile });
    return;
  }

  await page.goto('/login');
  await expect(page.getByText('Sign in to your mission control')).toBeVisible();

  // Fill credentials
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/dashboard|projects/, { timeout: 15_000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
