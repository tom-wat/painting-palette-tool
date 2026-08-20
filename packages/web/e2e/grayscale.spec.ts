import { test, expect } from '@playwright/test';
import { uploadFixtureImage } from './helpers';

test('greyscale chip toggles its pressed state', async ({ page }) => {
  await uploadFixtureImage(page);

  const toggle = page.getByRole('button', { name: 'Greyscale' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
