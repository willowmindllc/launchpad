import { test, expect } from '@playwright/test';

test.describe('Smoke Tests (unauthenticated)', () => {
  test('homepage redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/);
  });

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign in to your mission control')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page has OAuth buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
  });

  test('signup page accessible', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/signup/);
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);

    // Projects
    await page.goto('/projects');
    await expect(page).toHaveURL(/login/);

    // Settings
    await page.goto('/settings');
    await expect(page).toHaveURL(/login/);
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.getByRole('link', { name: /sign up|create.*account|register/i });
    await expect(signupLink).toBeVisible();
  });
});
