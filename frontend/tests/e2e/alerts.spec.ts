import { test, expect } from '@playwright/test';

test.describe('Alerts Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/alerts');
  });

  test('displays alerts table with severity tags and pagination', async ({ page }) => {
    await expect(page.getByText('Alerts Center')).toBeVisible();
    await expect(page.getByText('ID', { exact: true })).toBeVisible();
    await expect(page.getByText('Severity', { exact: true })).toBeVisible();
    await expect(page.getByText('ALT-9041')).toBeVisible();
  });

  test('filters alerts by search query', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search IP, description, alert ID…');
    await searchInput.fill('ALT-9041');
    await expect(page.getByText('ALT-9041')).toBeVisible();
  });

  test('opens alert evidence drawer on click', async ({ page }) => {
    await page.getByText('ALT-9041').click();
    await expect(page.getByText('Evidence (2)')).toBeVisible();
    await expect(page.getByRole('button', { name: /launch ai investigation/i })).toBeVisible();
  });
});
