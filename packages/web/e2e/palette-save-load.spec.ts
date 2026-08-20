import { test, expect } from '@playwright/test';
import { uploadFixtureImageAndExtract } from './helpers';

async function savePalette(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: 'Save Palette', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save Palette' });
  await dialog.getByPlaceholder('Enter palette name...').fill(name);
  await dialog.getByRole('button', { name: 'Save Palette', exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Switches the centre column to the saved-palette library. */
function showSaved(page: import('@playwright/test').Page) {
  return page.getByRole('radio', { name: 'Palette', exact: true }).click();
}

test('saved palette persists across a page reload', async ({ page }) => {
  const paletteName = `E2E Test Palette ${Date.now()}`;

  await uploadFixtureImageAndExtract(page);
  await savePalette(page, paletteName);

  await showSaved(page);
  await expect(page.getByRole('heading', { name: paletteName, level: 4 })).toBeVisible();

  await page.reload();
  await showSaved(page);
  await expect(page.getByRole('heading', { name: paletteName, level: 4 })).toBeVisible();
});

test('deleted palette does not reappear after reload', async ({ page }) => {
  const paletteName = `E2E Delete Me ${Date.now()}`;

  await uploadFixtureImageAndExtract(page);
  await savePalette(page, paletteName);

  await showSaved(page);
  const heading = page.getByRole('heading', { name: paletteName, level: 4 });
  await expect(heading).toBeVisible();

  const card = page.locator('[data-palette-id]', { has: heading });
  await card.getByRole('button', { name: 'Delete palette' }).click();

  const confirmDialog = page.getByRole('dialog', { name: 'Delete Palette' });
  await confirmDialog.getByRole('button', { name: 'Delete Palette', exact: true }).click();
  await expect(confirmDialog).toBeHidden();

  await expect(heading).toHaveCount(0);

  await page.reload();
  await showSaved(page);
  await expect(page.getByRole('heading', { name: paletteName, level: 4 })).toHaveCount(0);
});
