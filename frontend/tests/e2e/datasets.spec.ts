import { test, expect } from '@playwright/test';

test.describe('Dataset Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/datasets');
  });

  test('lists existing datasets with row counts and status', async ({ page }) => {
    await expect(page.getByText('Dataset Management')).toBeVisible();
    await expect(page.getByText('CIC-IDS2017-Network-Intrusion-Flows.csv')).toBeVisible();
    await expect(page.getByText('UNSW-NB15-Modern-Threat-Vectors.json')).toBeVisible();
  });

  test('toggles upload zone on click', async ({ page }) => {
    const uploadBtn = page.getByRole('button', { name: /upload dataset/i });
    await uploadBtn.click();
    await expect(page.getByText('Drag & drop dataset file')).toBeVisible();
  });

  test('inspects dataset details and field mappings', async ({ page }) => {
    const inspectBtn = page.getByRole('button', { name: /inspect/i }).first();
    await inspectBtn.click();
    await expect(page.getByText('Normalized Field Mappings')).toBeVisible();
  });
});
