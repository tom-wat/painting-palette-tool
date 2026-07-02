import { test, expect } from '@playwright/test';
import { uploadFixtureImageAndExtract } from './helpers';

async function savePalette(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'Save Palette', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save Palette' });
  await dialog.getByPlaceholder('Enter palette name...').fill(name);
  await dialog.getByRole('button', { name: 'Save Palette', exact: true }).click();
  await expect(dialog).toBeHidden();
}

test('saved palette persists across a page reload', async ({ page }) => {
  const paletteName = `E2E Test Palette ${Date.now()}`;

  await uploadFixtureImageAndExtract(page);
  await savePalette(page, paletteName);

  // Switch to the Palette tab (desktop layout) to see saved palettes.
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await expect(page.getByRole('heading', { name: paletteName, level: 4 })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await expect(page.getByRole('heading', { name: paletteName, level: 4 })).toBeVisible();
});

test('deleted palette does not reappear after reload', async ({ page }) => {
  const paletteName = `E2E Delete Me ${Date.now()}`;

  await uploadFixtureImageAndExtract(page);
  await savePalette(page, paletteName);

  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  const heading = page.getByRole('heading', { name: paletteName, level: 4 });
  await expect(heading).toBeVisible();

  const card = page.locator('div.border-gray-100.rounded-lg.p-3', { has: heading });
  await card.getByRole('button', { name: 'Delete palette' }).click();

  const confirmDialog = page.getByRole('dialog', { name: 'Delete Palette' });
  await confirmDialog.getByRole('button', { name: 'Delete Palette', exact: true }).click();
  await expect(confirmDialog).toBeHidden();

  await expect(heading).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: 'Palette', exact: true }).click();
  await expect(page.getByRole('heading', { name: paletteName, level: 4 })).toHaveCount(0);
});
