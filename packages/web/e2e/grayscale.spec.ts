import { test, expect } from '@playwright/test';
import { uploadFixtureImage } from './helpers';

test('grayscale toggle flips its own label', async ({ page }) => {
  await uploadFixtureImage(page);

  const toggle = page.getByRole('button', { name: 'Greyscale' });
  await expect(toggle).toBeVisible();

  await toggle.click();
  await expect(page.getByRole('button', { name: 'Color' })).toBeVisible();

  await page.getByRole('button', { name: 'Color' }).click();
  await expect(page.getByRole('button', { name: 'Greyscale' })).toBeVisible();
});
