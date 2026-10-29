import { test, expect } from '@playwright/test';

test.describe('Overview Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('renders top level security metrics', async ({ page }) => {
    await expect(page.getByText('Enterprise Security Operations Center')).toBeVisible();
    await expect(page.getByText('Total Events Analyzed')).toBeVisible();
    await expect(page.getByText('Critical & High Alerts')).toBeVisible();
    await expect(page.getByText('Datasets Ingested')).toBeVisible();
    await expect(page.getByText('Active Investigations')).toBeVisible();
  });

  test('displays alert trends chart and severity breakdown', async ({ page }) => {
    await expect(page.getByText('Alert Trend History')).toBeVisible();
    await expect(page.getByText('Severity Breakdown')).toBeVisible();
  });

  test('displays top threat sources and recent investigations', async ({ page }) => {
    await expect(page.getByText('Top Threat Sources')).toBeVisible();
    await expect(page.getByText('Active & Recent Investigations')).toBeVisible();
  });

  test('allows refreshing telemetry data', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh metrics/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });
});
