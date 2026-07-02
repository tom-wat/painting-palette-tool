/**
 * localStorage persistence for saved color palettes.
 * Single source of truth for the 'saved-palettes' key and its JSON shape —
 * do not read/write that key directly outside this module.
 */
import type { SavedPalette } from './export-formats';

export type { SavedPalette };

export const SAVED_PALETTES_STORAGE_KEY = 'saved-palettes';
const STORAGE_KEY = SAVED_PALETTES_STORAGE_KEY;

export function loadSavedPalettes(): SavedPalette[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load saved palettes:', error);
    return [];
  }
}

function persist(palettes: SavedPalette[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
}

/**
 * Append one palette to storage and return the full updated list.
 */
export function savePalette(palette: SavedPalette): SavedPalette[] {
  const palettes = [...loadSavedPalettes(), palette];
  persist(palettes);
  return palettes;
}

/**
 * Append multiple palettes at once (bulk JSON import) and return the full
 * updated list.
 */
export function savePalettes(newPalettes: SavedPalette[]): SavedPalette[] {
  const palettes = [...loadSavedPalettes(), ...newPalettes];
  persist(palettes);
  return palettes;
}

/**
 * Overwrite the entire stored list (used when the caller already holds the
 * next state, e.g. after computing a sorted/filtered list).
 */
export function saveAllPalettes(palettes: SavedPalette[]): void {
  persist(palettes);
}

export function updatePalette(
  id: string,
  patch: Partial<SavedPalette>
): SavedPalette[] {
  const palettes = loadSavedPalettes().map((p) =>
    p.id === id ? { ...p, ...patch } : p
  );
  persist(palettes);
  return palettes;
}

export function deletePalette(id: string): SavedPalette[] {
  const palettes = loadSavedPalettes().filter((p) => p.id !== id);
  persist(palettes);
  return palettes;
}
