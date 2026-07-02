import { useEffect, useRef, useState } from 'react';
import type { AnnotationMode, SelectionMode } from '@/components/features/AdvancedSelectionTools';
import type { AnnotationColorSpace } from '@/lib/annotation-render';

export const UI_SETTINGS_STORAGE_KEY = 'painting-palette-ui-settings';

/**
 * Persists annotation display preferences and the active selection mode to
 * localStorage, restoring them on mount. selectionMode lives outside this
 * hook (it's part of a larger selection-tool config owned by the caller),
 * so it's threaded through as a param/setter pair rather than owned here.
 */
export function useUISettings(
  selectionMode: SelectionMode,
  setSelectionMode: (_mode: SelectionMode) => void
) {
  const [annotationLineOpacity, setAnnotationLineOpacity] = useState(0.7);
  const [annotationFontSize, setAnnotationFontSize] = useState<number>(16);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('pick');
  const [annotationTheme, setAnnotationTheme] = useState<'light' | 'dark'>('dark');
  const [annotationLineColor, setAnnotationLineColor] = useState<string>('#ffffff');
  const [annotationColorSpace, setAnnotationColorSpace] = useState<AnnotationColorSpace>('hscl');
  const isInitialSave = useRef(true);

  // Load UI settings from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
      if (stored) {
        const s = JSON.parse(stored);
        if (s.annotationLineOpacity !== undefined) setAnnotationLineOpacity(s.annotationLineOpacity);
        if (s.annotationFontSize !== undefined) setAnnotationFontSize(s.annotationFontSize);
        if (s.annotationMode) setAnnotationMode(s.annotationMode);
        if (s.annotationTheme) setAnnotationTheme(s.annotationTheme);
        if (s.annotationLineColor) setAnnotationLineColor(s.annotationLineColor);
        if (s.annotationColorSpace) setAnnotationColorSpace(s.annotationColorSpace);
        if (s.selectionMode) setSelectionMode(s.selectionMode);
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save UI settings to localStorage on change (skip first run to avoid overwriting loaded values)
  useEffect(() => {
    if (isInitialSave.current) {
      isInitialSave.current = false;
      return;
    }
    try {
      const settings = {
        annotationLineOpacity,
        annotationFontSize,
        annotationMode,
        annotationTheme,
        annotationLineColor,
        annotationColorSpace,
        selectionMode,
      };
      localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [annotationLineOpacity, annotationFontSize, annotationMode, annotationTheme, annotationLineColor, annotationColorSpace, selectionMode]);

  return {
    annotationLineOpacity,
    setAnnotationLineOpacity,
    annotationFontSize,
    setAnnotationFontSize,
    annotationMode,
    setAnnotationMode,
    annotationTheme,
    setAnnotationTheme,
    annotationLineColor,
    setAnnotationLineColor,
    annotationColorSpace,
    setAnnotationColorSpace,
  };
}
