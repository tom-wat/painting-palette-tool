import { useEffect, useState } from 'react';
import {
  loadSavedPalettes,
  deletePalette,
  updatePalette,
  savePalette,
  savePalettes,
  SAVED_PALETTES_STORAGE_KEY,
  type SavedPalette,
} from '@/lib/palette-storage';

function sortByCreatedAtDesc(palettes: SavedPalette[]): SavedPalette[] {
  return palettes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function collectTags(palettes: SavedPalette[]): string[] {
  const allTags = new Set<string>();
  palettes.forEach((palette) => {
    palette.tags?.forEach((tag) => allTags.add(tag));
  });
  return Array.from(allTags).sort();
}

/**
 * Owns the saved-palettes list and its localStorage sync: loads on mount,
 * re-loads on cross-tab `storage` events and same-tab `palettes-updated`
 * custom events (dispatched by ColorPalette's save flow and by the mutating
 * functions below), and keeps `availableTags` derived from the current list.
 */
export function useSavedPalettesStore() {
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    const loadPalettes = () => {
      const palettes = loadSavedPalettes();
      const sortedPalettes = sortByCreatedAtDesc(palettes);
      setSavedPalettes(sortedPalettes);
      setAvailableTags(collectTags(sortedPalettes));
    };

    loadPalettes();

    // Listen for storage changes (when palettes are saved from ColorPalette component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SAVED_PALETTES_STORAGE_KEY) {
        loadPalettes();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events from the same page
    const handleCustomUpdate = () => {
      loadPalettes();
    };

    window.addEventListener('palettes-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('palettes-updated', handleCustomUpdate);
    };
  }, []);

  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent('palettes-updated'));
  };

  const deletePaletteById = (id: string) => {
    const updatedPalettes = deletePalette(id);
    setSavedPalettes(updatedPalettes);
    notifyUpdated();
    return updatedPalettes;
  };

  const updatePaletteById = (id: string, patch: Partial<SavedPalette>) => {
    const updatedPalettes = updatePalette(id, patch);
    setSavedPalettes(updatedPalettes);
    setAvailableTags(collectTags(updatedPalettes));
    notifyUpdated();
    return updatedPalettes;
  };

  const importOnePalette = (palette: SavedPalette) => {
    const updatedPalettes = sortByCreatedAtDesc(savePalette(palette));
    setSavedPalettes(updatedPalettes);
    setAvailableTags(collectTags(updatedPalettes));
    notifyUpdated();
    return updatedPalettes;
  };

  const importManyPalettes = (palettes: SavedPalette[]) => {
    const updatedPalettes = sortByCreatedAtDesc(savePalettes(palettes));
    setSavedPalettes(updatedPalettes);
    setAvailableTags(collectTags(updatedPalettes));
    notifyUpdated();
    return updatedPalettes;
  };

  return {
    savedPalettes,
    availableTags,
    deletePaletteById,
    updatePaletteById,
    importOnePalette,
    importManyPalettes,
  };
}
