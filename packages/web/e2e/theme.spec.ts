import { test, expect, type Page } from '@playwright/test';
import { uploadFixtureImageAndExtract } from './helpers';

/**
 * The UI theme is one `.dark` class on <html>; every token, and therefore the
 * whole interface, follows from it. What is worth testing at this level is the
 * wiring that unit tests cannot reach: that the class survives a reload without
 * a light-mode flash, that `system` really tracks the OS, and that the page is
 * actually repainted rather than just re-classed.
 */

type ThemeLabel = 'Light' | 'Dark' | 'System';

function themeTrigger(page: Page) {
  return page.getByRole('button', { name: 'Theme' });
}

async function chooseTheme(page: Page, label: ThemeLabel) {
  await themeTrigger(page).click();
  await page.getByRole('menuitemradio', { name: label, exact: true }).click();
}

/**
 * The body background as sRGB channels.
 *
 * `getComputedStyle` hands back the authored colour space — `oklch(1 0 0)` here,
 * not `rgb(...)` — so the value is pushed through a canvas to get the channels
 * that would actually be painted. That also catches a token which resolved to
 * nothing, which would otherwise read as a plausible-looking string.
 */
function bodyBackground(page: Page) {
  return page.evaluate(() => {
    const computed = getComputedStyle(document.body).backgroundColor;
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return { computed, r: data[0], g: data[1], b: data[2] };
  });
}

function htmlIsDark(page: Page) {
  return page.evaluate(() => document.documentElement.classList.contains('dark'));
}

test.describe('theme switching', () => {
  test('dark mode repaints the app, not just the class', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const light = await bodyBackground(page);
    expect(await htmlIsDark(page)).toBe(false);

    await chooseTheme(page, 'Dark');

    expect(await htmlIsDark(page)).toBe(true);
    const dark = await bodyBackground(page);
    expect(dark.computed).not.toBe(light.computed);

    // Near-white against near-black. Compared as brightness rather than exact
    // channels so the oklch-to-sRGB rounding is not pinned down here.
    const brightness = (c: { r: number; g: number; b: number }) => (c.r + c.g + c.b) / 3;
    expect(brightness(light)).toBeGreaterThan(200);
    expect(brightness(dark)).toBeLessThan(60);
  });

  test('switching back to light is not one-way', async ({ page }) => {
    await page.goto('/');
    await chooseTheme(page, 'Dark');
    expect(await htmlIsDark(page)).toBe(true);

    await chooseTheme(page, 'Light');
    expect(await htmlIsDark(page)).toBe(false);
  });

  test('color-scheme follows, so native chrome inverts too', async ({ page }) => {
    await page.goto('/');
    await chooseTheme(page, 'Dark');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.colorScheme))
      .toBe('dark');
  });

  test('theme-color meta tracks the background for the PWA title bar', async ({ page }) => {
    await page.goto('/');
    await chooseTheme(page, 'Dark');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content
        )
      )
      .toBe('#0a0a0a');
  });
});

test.describe('persistence and first paint', () => {
  test('the choice survives a reload with no light-mode flash', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await chooseTheme(page, 'Dark');

    // Record whether <html> was already dark at the moment <body> was created.
    // If the class were applied by React instead of the blocking script in
    // layout.tsx, the body would exist — and paint white — first.
    await page.addInitScript(() => {
      // An init script runs before <html> itself exists, so the observer has to
      // be hung off the document rather than off documentElement.
      const observer = new MutationObserver(() => {
        if (!document.body) return;
        (window as unknown as Record<string, unknown>).__darkAtBodyStart =
          document.documentElement.classList.contains('dark');
        observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    });

    await page.reload();

    expect(await htmlIsDark(page)).toBe(true);
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__darkAtBodyStart
      )
    ).toBe(true);
  });

  test('System follows the OS setting in both directions', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await chooseTheme(page, 'System');
    expect(await htmlIsDark(page)).toBe(true);

    // The menu is closed, so nothing theme-related is mounted below the
    // provider. The media-query listener belongs to ThemeProvider at the app
    // root; when it lived in the switch, dismissing the switch quietly stopped
    // the app following the OS.
    await expect(page.getByRole('menu')).toHaveCount(0);

    // No reload: a schedule flipping at dusk takes effect in place.
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => htmlIsDark(page)).toBe(false);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => htmlIsDark(page)).toBe(true);
  });

  test('an explicit choice overrides the OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await chooseTheme(page, 'Light');

    expect(await htmlIsDark(page)).toBe(false);
    await page.reload();
    expect(await htmlIsDark(page)).toBe(false);
  });
});

test.describe('header toggle', () => {
  test('the menu marks the active theme and applies a new one', async ({ page }) => {
    await page.goto('/');
    await chooseTheme(page, 'Light');

    await themeTrigger(page).click();
    await expect(page.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    expect(await htmlIsDark(page)).toBe(true);
    // Choosing dismisses the menu.
    await expect(page.getByRole('menu')).toHaveCount(0);

    await themeTrigger(page).click();
    await expect(page.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('the trigger icon follows the resolved theme', async ({ page }) => {
    await page.goto('/');

    // Sun in light, moon in dark — the two icons are both in the DOM and
    // swapped by CSS, so exactly one is ever visible.
    const icons = themeTrigger(page).locator('svg');
    await expect(icons).toHaveCount(2);

    await chooseTheme(page, 'Light');
    await expect(themeTrigger(page).locator('svg:visible')).toHaveCount(1);
    const lightIcon = await themeTrigger(page).locator('svg:visible').getAttribute('class');

    await chooseTheme(page, 'Dark');
    await expect(themeTrigger(page).locator('svg:visible')).toHaveCount(1);
    const darkIcon = await themeTrigger(page).locator('svg:visible').getAttribute('class');

    expect(lightIcon).not.toBe(darkIcon);
  });

  test('the right icon is on screen at first paint, with no pop-in', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await chooseTheme(page, 'Dark');

    // The icon is chosen from the `.dark` class, so the class has to be on
    // <html> by the time <body> exists — i.e. written by the blocking script.
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        if (!document.body) return;
        (window as unknown as Record<string, unknown>).__darkAtBodyStart =
          document.documentElement.classList.contains('dark');
        observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    });

    await page.reload();

    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__darkAtBodyStart
      )
    ).toBe(true);
    await expect(themeTrigger(page).locator('svg:visible')).toHaveCount(1);
  });

  test('closes on Escape and on a click outside', async ({ page }) => {
    await page.goto('/');

    await themeTrigger(page).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(themeTrigger(page)).toBeFocused();

    await themeTrigger(page).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.mouse.click(400, 400);
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('arrow keys walk the items and Enter picks one', async ({ page }) => {
    await page.goto('/');
    await chooseTheme(page, 'Light');

    await themeTrigger(page).click();
    // Opens with the active item focused, so one step down lands on Dark.
    await expect(page.getByRole('menuitemradio', { name: 'Light' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: 'Dark' })).toBeFocused();
    await page.keyboard.press('Enter');

    expect(await htmlIsDark(page)).toBe(true);
  });
});

test.describe('the working UI in dark mode', () => {
  test('canvas, palette and panels render with an image loaded', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await uploadFixtureImageAndExtract(page);
    await chooseTheme(page, 'Dark');

    await expect(page.getByRole('heading', { name: 'Extracted Color Palette' })).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
    expect(await htmlIsDark(page)).toBe(true);
  });
});
