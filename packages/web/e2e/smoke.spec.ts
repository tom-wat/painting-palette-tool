import { test, expect } from '@playwright/test';

test('app loads with monochrome header and upload dropzone', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Painting Palette' })).toBeVisible();
  await expect(page.getByText('Drop image here or click to select')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Greyscale' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Canvas' })).toHaveAttribute(
    'aria-checked',
    'true'
  );
});
