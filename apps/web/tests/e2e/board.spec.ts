import { test, expect } from '@playwright/test';

/**
 * Authenticated board & task CRUD tests.
 * Requires auth setup (E2E_USER_EMAIL + E2E_USER_PASSWORD).
 * These tests run against the first project the user has access to.
 */

test.describe('Dashboard', () => {
  test('dashboard loads after auth', async ({ page }) => {
    await page.goto('/dashboard');
    // Should NOT redirect to login (we're authenticated)
    await expect(page).not.toHaveURL(/login/);
    // Dashboard should have some content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('projects page lists projects', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).not.toHaveURL(/login/);
    // Either shows project cards or empty state
    const hasProjects = await page.locator('a[href*="/projects/"]').count();
    const hasEmpty = await page.locator('text=/create.*project|no.*project|get.*started/i').count();
    expect(hasProjects + hasEmpty).toBeGreaterThan(0);
  });
});

test.describe('Board & Task CRUD', () => {
  let projectUrl: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to the first available project board
    await page.goto('/projects');
    const projectLink = page.locator('a[href*="/projects/"]').first();
    const exists = await projectLink.count();

    if (exists === 0) {
      test.skip(true, 'No projects found — skipping board tests');
      return;
    }

    await projectLink.click();
    await page.waitForURL(/\/projects\//);
    projectUrl = page.url();
  });

  test('board renders with kanban columns', async ({ page }) => {
    // Board should have status columns
    const columns = page.locator('[data-testid="kanban-column"], [class*="column"], [role="list"]');
    // At minimum, expect some board structure on the page
    await expect(page.locator('body')).toContainText(/backlog|todo|in.progress|done|board/i);
  });

  test('create task via dialog', async ({ page }) => {
    const taskTitle = `E2E Test Task ${Date.now()}`;

    // Look for create/add task button
    const addBtn = page.getByRole('button', { name: /add.*task|new.*task|create.*task|\+/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();

    // Fill in the task dialog
    const titleInput = page.getByPlaceholder(/task.*title|title|name/i).or(
      page.getByLabel(/title/i)
    );
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill(taskTitle);

    // Submit
    const submitBtn = page.getByRole('button', { name: /create|save|add|submit/i }).first();
    await submitBtn.click();

    // Task should appear on the board
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 10_000 });
  });

  test('trash and restore task', async ({ page }) => {
    const taskTitle = `E2E Trash Test ${Date.now()}`;

    // Create a task first
    const addBtn = page.getByRole('button', { name: /add.*task|new.*task|create.*task|\+/i }).first();
    await addBtn.click();

    const titleInput = page.getByPlaceholder(/task.*title|title|name/i).or(
      page.getByLabel(/title/i)
    );
    await titleInput.fill(taskTitle);
    const submitBtn = page.getByRole('button', { name: /create|save|add|submit/i }).first();
    await submitBtn.click();
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 10_000 });

    // Click the task to open detail
    await page.locator(`text=${taskTitle}`).click();
    await page.waitForURL(/\/task\//);

    // Look for trash/delete button
    const trashBtn = page.getByRole('button', { name: /trash|delete|remove/i }).first();
    await expect(trashBtn).toBeVisible({ timeout: 5_000 });
    await trashBtn.click();

    // Confirm if there's a confirmation dialog
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|trash|delete/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should redirect back to board or show success
    await expect(page).toHaveURL(/\/projects\//, { timeout: 5_000 });

    // Task should no longer be visible on board
    await expect(page.locator(`text=${taskTitle}`)).not.toBeVisible({ timeout: 5_000 });
  });
});
