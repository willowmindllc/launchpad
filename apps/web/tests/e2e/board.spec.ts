import { test, expect } from '@playwright/test';

/**
 * Authenticated board & task CRUD tests.
 * Requires auth setup (E2E_USER_EMAIL + E2E_USER_PASSWORD).
 */

test.describe('Dashboard', () => {
  test('dashboard loads after auth', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/login/);
  });

  test('projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe('Board & Task CRUD', () => {
  test.describe.configure({ mode: 'serial' });

  const projectName = `E2E Test Project ${Date.now()}`;
  const taskTitle = `E2E Task ${Date.now()}`;

  test('create project if none exist', async ({ page }) => {
    await page.goto('/projects');

    // Check if any projects exist
    const projectLinks = page.locator('a[href*="/projects/"]');
    const count = await projectLinks.count();

    if (count > 0) {
      test.skip(true, 'Projects already exist — skipping creation');
      return;
    }

    // Create a new project
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByPlaceholder('My Awesome Project').fill(projectName);
    await page.getByPlaceholder("What's this project about?").fill('Automated E2E test project');
    await page.getByRole('button', { name: /create/i }).click();

    // Project should appear in the list
    await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 10_000 });
  });

  test('board renders with columns', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('a[href*="/projects/"]').first().click();
    await page.waitForURL(/\/projects\//);

    // Board should show status column labels
    await expect(page.locator('body')).toContainText(/backlog|todo|in.progress|done/i);
  });

  test('create task via dialog', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('a[href*="/projects/"]').first().click();
    await page.waitForURL(/\/projects\//);

    // Click add task button
    const addBtn = page.getByRole('button', { name: /add.*task|new.*task|\+/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();

    // Fill task title
    const titleInput = page.getByPlaceholder('What needs to be done?');
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill(taskTitle);

    // Submit
    await page.getByRole('button', { name: /create task/i }).click();

    // Task should appear on board
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 10_000 });
  });

  test('open task detail', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('a[href*="/projects/"]').first().click();
    await page.waitForURL(/\/projects\//);

    // Click the task to open detail view
    await page.locator(`text=${taskTitle}`).click();
    await expect(page).toHaveURL(/\/task\//, { timeout: 5_000 });
  });

  test('trash task', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('a[href*="/projects/"]').first().click();
    await page.waitForURL(/\/projects\//);

    // Click task to open detail
    await page.locator(`text=${taskTitle}`).click();
    await expect(page).toHaveURL(/\/task\//, { timeout: 5_000 });

    // Trash the task
    const trashBtn = page.getByRole('button', { name: /trash|delete/i }).first();
    await expect(trashBtn).toBeVisible({ timeout: 5_000 });
    await trashBtn.click();

    // Confirm if dialog appears
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|trash|delete/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Should go back to board (or stay on project page)
    await page.waitForURL(/\/projects\//, { timeout: 5_000 });

    // Task should be gone from board cards (exclude route announcer)
    const taskCards = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}"), .task-card:has-text("${taskTitle}")`);
    // If no test-id, check that the task title doesn't appear in the main content area
    const mainContent = page.locator('main, [role="main"], .board, [class*="kanban"]');
    if (await mainContent.count() > 0) {
      await expect(mainContent.locator(`text=${taskTitle}`)).not.toBeVisible({ timeout: 5_000 });
    } else {
      // Fallback: just verify we're on the board, not on the task detail page
      await expect(page).not.toHaveURL(/\/task\//);
    }
  });
});
