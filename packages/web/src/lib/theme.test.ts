import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getSystemTheme,
  isThemePreference,
  nextThemePreference,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  syncThemeColorMeta,
} from './theme';

/**
 * The theme is one class on <html>; everything downstream (tokens, canvas
 * exports, native scrollbars) keys off it. These cover the parts that decide
 * *which* class, plus the storage fallbacks that must not throw when a browser
 * refuses localStorage.
 */
function mockMatchMedia(prefersDark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: prefersDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
}

describe('theme preference storage', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to system when nothing is stored', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it('round-trips a stored preference', () => {
    storeTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores a stored value that is no longer a valid preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredTheme()).toBe('system');
  });

  it('falls back to system rather than throwing when storage is blocked', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(readStoredTheme()).toBe('system');
    getItem.mockRestore();
  });

  it('swallows a write failure so the session keeps the preference', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => storeTheme('dark')).not.toThrow();
    setItem.mockRestore();
  });
});

describe('isThemePreference', () => {
  it('accepts the three preferences and nothing else', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('uses the explicit preference over the system setting', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });

  it('defers to the system setting when the preference is system', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
  });
});

describe('getSystemTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads prefers-color-scheme', () => {
    mockMatchMedia(true);
    expect(getSystemTheme()).toBe('dark');
    mockMatchMedia(false);
    expect(getSystemTheme()).toBe('light');
  });

  it('assumes light where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(getSystemTheme()).toBe('light');
  });
});

describe('nextThemePreference', () => {
  it('cycles light to dark to system and back', () => {
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
    expect(nextThemePreference('system')).toBe('light');
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('adds the class tailwind darkMode keys off', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes it again, so switching back is not one-way', () => {
    applyTheme('dark');
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('sets color-scheme so scrollbars and form chrome invert too', () => {
    applyTheme('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('syncThemeColorMeta', () => {
  afterEach(() => {
    document.querySelector('meta[name="theme-color"]')?.remove();
    document.documentElement.style.removeProperty('--background');
  });

  it('creates the meta tag when the document has none', () => {
    document.documentElement.style.setProperty('--background', '0.145 0 0');
    syncThemeColorMeta();

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    expect(meta?.content).toBe('#0a0a0a');
  });

  it('updates the existing tag instead of appending a second one', () => {
    document.documentElement.style.setProperty('--background', '1 0 0');
    syncThemeColorMeta();
    document.documentElement.style.setProperty('--background', '0.145 0 0');
    syncThemeColorMeta();

    const metas = document.querySelectorAll('meta[name="theme-color"]');
    expect(metas).toHaveLength(1);
    expect((metas[0] as HTMLMetaElement).content).toBe('#0a0a0a');
  });
});
