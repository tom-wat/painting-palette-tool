import { test, expect } from '@playwright/test';
import { uploadFixtureImage, uploadFixtureImageAndExtract } from './helpers';

test('a rectangle selection extracts a color palette with visible swatches', async ({ page }) => {
  await uploadFixtureImageAndExtract(page);

  const swatches = page.locator('.aspect-square');
  expect(await swatches.count()).toBeGreaterThan(0);
});

test('canvas zoom controls respond after upload', async ({ page }) => {
  await uploadFixtureImage(page);

  // The canvas viewport should be present and scrollable/zoomable; a wheel
  // event over it should not throw and the canvas should remain visible.
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.hover();
  await page.mouse.wheel(0, -100);
  await expect(canvas).toBeVisible();
});
