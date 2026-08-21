/**
 * UI theme preference: which of the two palettes in `globals.css` is active.
 *
 * `tailwind.config.ts` is `darkMode: 'class'`, so the whole switch is the
 * `.dark` class on <html> — every semantic token then resolves to the dark
 * value and the UI follows for free. Nothing here knows about individual
 * colours.
 *
 * Not to be confused with the *annotation* theme in `useUISettings`: that one
 * picks the label-box colours drawn on top of the user's image, which depend on
 * the image rather than on the UI, and stays a separate setting.
 */

import { getCanvasThemeColor } from './canvas-theme';

/** What the user asked for. `system` defers to the OS. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What is actually on screen once `system` has been resolved. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'painting-palette-theme';

/** Cycle order for the toggle, and the option order in the settings panel. */
export const THEME_PREFERENCES: readonly ThemePreference[] = [
  'light',
  'dark',
  'system',
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    value === 'light' || value === 'dark' || value === 'system'
  );
}

/** Stored preference, or `system` when nothing valid is stored. */
export function readStoredTheme(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    // Private mode / disabled storage: fall back rather than break the app.
    return 'system';
  }
}

export function storeTheme(preference: ThemePreference): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore: the preference still applies for this session.
  }
}

/** The OS-level preference. Defaults to light where it cannot be read. */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference;
}

/** Next preference in the cycle — light → dark → system → light. */
export function nextThemePreference(
  preference: ThemePreference
): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(preference);
  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];
}

/**
 * Put the resolved theme on the document.
 *
 * `color-scheme` is set alongside the class so that the things CSS variables
 * cannot reach — scrollbars, the native file picker button, form control
 * chrome — turn dark too, instead of staying light-on-dark.
 */
export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * Keep the browser/PWA chrome (address bar, standalone title bar) on the same
 * background as the app.
 *
 * The value is read back from the live `--background` token rather than
 * hard-coded, so retheming `globals.css` carries here the same way it carries
 * into a PNG export. Call this after `applyTheme`, once the class is on.
 */
export function syncThemeColorMeta(): void {
  if (typeof document === 'undefined') return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = getCanvasThemeColor('--background');
}
