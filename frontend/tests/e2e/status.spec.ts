import { test, expect } from '@playwright/test';

test.describe('System Status & Telemetry', () => {
  test('displays service health cards and inference cluster telemetry', async ({ page }) => {
    await page.goto('/status');

    await expect(page.getByText('System Status')).toBeVisible();
    await expect(page.getByText('FastAPI Backend')).toBeVisible();
    await expect(page.getByText('Data Pipeline')).toBeVisible();
    await expect(page.getByText('Nebius Inference')).toBeVisible();
    await expect(page.getByText('NVIDIA Nemotron-70B')).toBeVisible();
  });
});
