import { test, expect } from '@playwright/test';

test('mobile panels open as bottom sheets and the header switches views', async ({ page }) => {
  await page.goto('/');

  const panelBar = page.getByRole('navigation');
  await expect(panelBar.getByRole('button', { name: 'Controls' })).toBeVisible();
  await expect(panelBar.getByRole('button', { name: 'Colors' })).toBeVisible();

  // Each panel is a bottom sheet on mobile rather than a sidebar.
  await panelBar.getByRole('button', { name: 'Controls' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Controls' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Extraction Settings' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();

  // Canvas / Saved is a header-level switch shared with the desktop layout.
  await page.getByRole('radio', { name: 'Palette', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Saved Palettes/ })).toBeVisible();

  await page.getByRole('radio', { name: 'Canvas' }).click();
  await expect(page.getByText('Tap to select image')).toBeVisible();
});
