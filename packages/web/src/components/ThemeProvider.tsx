'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyTheme,
  getSystemTheme,
  nextThemePreference,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  syncThemeColorMeta,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  /** What the user picked — `system` included. */
  preference: ThemePreference;
  /** What is on screen right now. */
  resolvedTheme: ResolvedTheme;
  setPreference: (_preference: ThemePreference) => void;
  /** light → dark → system → light. */
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Owns the UI theme for the whole app.
 *
 * This has to sit at the root rather than inside whichever panel happens to
 * show the switch: while the preference is `system` the OS media query is
 * watched live, and a listener that only exists while a settings section is
 * expanded would silently stop following the OS the moment it is collapsed.
 *
 * The initial state is read from storage lazily rather than in an effect. The
 * blocking script in `layout.tsx` has already put the right class on <html>
 * before first paint, so starting from the same value makes the sync effect
 * below a no-op on mount instead of briefly flipping the page to light.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : readStoredTheme()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    typeof window === 'undefined' ? 'light' : getSystemTheme()
  );

  // Follow the OS live, so a schedule flipping at dusk takes effect in place.
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light');

    setSystemTheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = resolveTheme(preference, systemTheme);

  useEffect(() => {
    applyTheme(resolvedTheme);
    syncThemeColorMeta();
  }, [resolvedTheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    storeTheme(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      cycle: () => setPreference(nextThemePreference(preference)),
    }),
    [preference, resolvedTheme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider> (see app/layout.tsx)');
  }
  return context;
}
