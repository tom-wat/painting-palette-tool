import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { uploadFixtureImageAndExtract } from './helpers';

/**
 * PNG export used to be an html2canvas screenshot of the palette card, which
 * threw on the theme's oklch() colours and silently produced no download.
 * These walk the real download so a regression cannot hide again.
 */
async function saveAndShowPalette(page: import('@playwright/test').Page, name: string) {
  await uploadFixtureImageAndExtract(page);
  await page.getByRole('button', { name: 'Save Palette', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save Palette' });
  await dialog.getByPlaceholder('Enter palette name...').fill(name);
  await dialog.getByRole('button', { name: 'Save Palette', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('radio', { name: 'Palette', exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 4 })).toBeVisible();
}

/** A PNG blob big enough to be a real palette image, not an empty canvas. */
async function expectPngDownload(download: import('@playwright/test').Download, prefix: string) {
  expect(download.suggestedFilename()).toContain(prefix);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const buffer = fs.readFileSync(await download.path());
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(buffer.byteLength).toBeGreaterThan(1000);
  return buffer;
}

/** Pixel height from the PNG's IHDR chunk. */
function pngHeight(buffer: Buffer): number {
  return buffer.readUInt32BE(20);
}

test('a saved palette downloads as a PNG', async ({ page }) => {
  const name = `E2E Png ${Date.now()}`;
  await saveAndShowPalette(page, name);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG', exact: true }).first().click(),
  ]);
  await expectPngDownload(download, name);
});

test('PNG All downloads every saved palette in one image', async ({ page }) => {
  const name = `E2E Png All ${Date.now()}`;
  await saveAndShowPalette(page, name);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG All' }).click(),
  ]);
  await expectPngDownload(download, 'all-palettes');
});

test('the detail dialog still exports the non-PNG formats', async ({ page }) => {
  const name = `E2E Json ${Date.now()}`;
  await saveAndShowPalette(page, name);

  await page.getByRole('heading', { name, level: 4 }).click();
  const detail = page.getByRole('dialog');
  await expect(detail.getByText('Export Palette')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    detail.getByRole('button', { name: 'JSON', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toContain(name);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
});

test('the exported PNG follows the panel\'s Show Data toggle', async ({ page }) => {
  const name = `E2E Png Labels ${Date.now()}`;
  await saveAndShowPalette(page, name);

  const exportPng = async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PNG', exact: true }).first().click(),
    ]);
    return pngHeight(await expectPngDownload(download, name));
  };

  const withoutLabels = await exportPng();

  await page.getByRole('button', { name: 'Show Data' }).first().click();
  await expect(page.getByRole('button', { name: 'Hide Data' }).first()).toBeVisible();

  // Labels add a row above every bar, so the image has to grow. Without this,
  // the toggle could stop reaching the export and nothing would fail.
  expect(await exportPng()).toBeGreaterThan(withoutLabels);
});
