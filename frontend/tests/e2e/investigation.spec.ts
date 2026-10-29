import { test, expect } from '@playwright/test';

test.describe('Investigation Workspace', () => {
  test('renders three-panel layout and agent execution steps', async ({ page }) => {
    await page.goto('/investigations');

    await expect(page.getByText('Investigation Workspace')).toBeVisible();
    await expect(page.getByText('Recent Investigations')).toBeVisible();
    await expect(page.getByText('Agent Execution Timeline')).toBeVisible();
    await expect(page.getByText('Key Findings')).toBeVisible();
  });

  test('displays MITRE technique mappings and recommendations', async ({ page }) => {
    await page.goto('/investigations');

    await expect(page.getByText('T1071.001')).toBeVisible();
    await expect(page.getByText('Recommendations')).toBeVisible();
    await expect(page.getByRole('button', { name: /export investigation report/i })).toBeVisible();
  });
});
