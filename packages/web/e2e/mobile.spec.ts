import { test, expect } from '@playwright/test';

test('mobile tab bar switches between canvas and saved views', async ({ page }) => {
  await page.goto('/');

  const tabBar = page.getByRole('navigation');
  await expect(tabBar.getByRole('button', { name: 'Canvas' })).toBeVisible();
  await expect(tabBar.getByRole('button', { name: 'Tools' })).toBeVisible();
  await expect(tabBar.getByRole('button', { name: 'Palette' })).toBeVisible();
  await expect(tabBar.getByRole('button', { name: 'Saved' })).toBeVisible();

  await tabBar.getByRole('button', { name: 'Saved' }).click();
  await expect(page.getByRole('heading', { name: /Saved Palettes/ })).toBeVisible();

  await tabBar.getByRole('button', { name: 'Canvas' }).click();
  await expect(page.locator('main:visible').getByText('Tap to select image')).toBeVisible();
});
