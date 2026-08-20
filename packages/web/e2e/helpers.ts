import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'quadrants.png');

/**
 * Uploads the fixture quadrant image via the hidden file input and waits for
 * the extracted-color panel to render.
 */
export async function uploadFixtureImage(page: Page) {
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(FIXTURE_IMAGE);
  await expect(page.getByRole('heading', { name: 'Extracted Color Palette' })).toBeVisible({
    timeout: 15_000,
  });
}

/**
 * The selection mode lives in two SegmentedControls — the left panel and the
 * mobile bar above the canvas — one of which is always hidden by CSS.
 */
function selectionMode(page: Page, label: string) {
  return page.getByRole('radio', { name: label, exact: true }).filter({ visible: true });
}

/**
 * Colors are only extracted from an explicit selection, not automatically on
 * upload. Switches to rectangle mode and drags a box over the canvas, which
 * auto-extracts on mouse-up (ImageCanvas.tsx handleMouseUp, rectangle case).
 */
export async function selectRectangleOnCanvas(page: Page) {
  await selectionMode(page, 'Rect').click();

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');

  const from = { x: box.x + box.width * 0.2, y: box.y + box.height * 0.2 };
  const to = { x: box.x + box.width * 0.8, y: box.y + box.height * 0.8 };

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

export async function uploadFixtureImageAndExtract(page: Page) {
  await uploadFixtureImage(page);
  await selectRectangleOnCanvas(page);
  await expect(page.locator('.aspect-square').first()).toBeVisible({ timeout: 10_000 });
}
