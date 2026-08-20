import { test, expect } from '@playwright/test';
import { uploadFixtureImage, selectRectangleOnCanvas } from './helpers';

/** The selection-mode control exists twice (left panel + mobile bar). */
function mode(page: import('@playwright/test').Page, label: string) {
  return page.getByRole('radio', { name: label, exact: true }).filter({ visible: true });
}

test('the zoom readout doubles as the actual-size control', async ({ page }) => {
  await uploadFixtureImage(page);

  const readout = page.getByRole('button', { name: 'Actual size' });
  await expect(readout).toHaveText('100%');

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(readout).not.toHaveText('100%');

  await readout.click();
  await expect(readout).toHaveText('100%');

  // Zoom out then back to actual size, so it is not just a no-op in one direction.
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(readout).not.toHaveText('100%');
  await readout.click();
  await expect(readout).toHaveText('100%');
});

test('the canvas carries no chrome beyond the zoom pill', async ({ page }) => {
  await uploadFixtureImage(page);

  // Undo/Redo/Clear moved to the header; the old canvas title and footer are gone.
  await expect(page.getByText('Image Canvas')).toHaveCount(0);
  await expect(page.getByText(/Scroll wheel to zoom/)).toHaveCount(0);

  for (const name of ['Zoom out', 'Actual size', 'Zoom in', 'Fit to screen']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
});

test('Clear lives in the header and tracks whether a selection exists', async ({ page }) => {
  await uploadFixtureImage(page);

  const clear = page.getByRole('button', { name: 'Clear', exact: true });
  // Point mode has nothing to clear.
  await expect(clear).toHaveCount(0);

  await mode(page, 'Rect').click();
  await expect(clear).toBeVisible();
  await expect(clear).toBeDisabled();

  await selectRectangleOnCanvas(page);
  await expect(clear).toBeEnabled();

  await clear.click();
  await expect(clear).toBeDisabled();
});

test('Undo and Redo appear in the header only while annotating', async ({ page }) => {
  await uploadFixtureImage(page);

  const undo = page.getByRole('button', { name: 'Undo' });
  const redo = page.getByRole('button', { name: 'Redo' });
  await expect(undo).toHaveCount(0);

  await mode(page, 'Point').click();
  await mode(page, 'Annotate').click();
  await expect(undo).toBeVisible();
  await expect(redo).toBeVisible();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await mode(page, 'Pick').click();
  await expect(undo).toHaveCount(0);
});

test('the header switches the centre column between Canvas and Palette', async ({ page }) => {
  await page.goto('/');

  const canvasTab = page.getByRole('radio', { name: 'Canvas', exact: true });
  const paletteTab = page.getByRole('radio', { name: 'Palette', exact: true });
  await expect(canvasTab).toHaveAttribute('aria-checked', 'true');

  await paletteTab.click();
  await expect(page.getByRole('heading', { name: /Saved Palettes/ })).toBeVisible();
  await expect(paletteTab).toHaveAttribute('aria-checked', 'true');

  await canvasTab.click();
  await expect(page.getByText('Drop image here or click to select')).toBeVisible();
});
