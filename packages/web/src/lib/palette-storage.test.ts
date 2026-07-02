import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSavedPalettes,
  savePalette,
  savePalettes,
  saveAllPalettes,
  updatePalette,
  deletePalette,
  type SavedPalette,
} from './palette-storage';

function makePalette(id: string, overrides: Partial<SavedPalette> = {}): SavedPalette {
  return {
    id,
    name: `Palette ${id}`,
    colors: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('loadSavedPalettes', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(loadSavedPalettes()).toEqual([]);
  });

  it('returns an empty array and does not throw on corrupt JSON', () => {
    localStorage.setItem('saved-palettes', '{not valid json');
    expect(loadSavedPalettes()).toEqual([]);
  });

  it('returns stored palettes as-is', () => {
    const palette = makePalette('p1');
    localStorage.setItem('saved-palettes', JSON.stringify([palette]));
    expect(loadSavedPalettes()).toEqual([palette]);
  });
});

describe('savePalette', () => {
  it('appends to an empty store', () => {
    const palette = makePalette('p1');
    const result = savePalette(palette);
    expect(result).toEqual([palette]);
    expect(loadSavedPalettes()).toEqual([palette]);
  });

  it('appends to an existing store without disturbing existing entries', () => {
    savePalette(makePalette('p1'));
    const result = savePalette(makePalette('p2'));
    expect(result.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});

describe('savePalettes', () => {
  it('appends multiple palettes at once', () => {
    savePalette(makePalette('p1'));
    const result = savePalettes([makePalette('p2'), makePalette('p3')]);
    expect(result.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('saveAllPalettes', () => {
  it('overwrites the entire stored list', () => {
    savePalette(makePalette('p1'));
    saveAllPalettes([makePalette('p2')]);
    expect(loadSavedPalettes().map((p) => p.id)).toEqual(['p2']);
  });
});

describe('updatePalette', () => {
  it('merges the patch into the matching palette and persists it', () => {
    savePalette(makePalette('p1', { name: 'Old Name' }));
    const result = updatePalette('p1', { name: 'New Name' });
    expect(result[0]!.name).toBe('New Name');
    expect(loadSavedPalettes()[0]!.name).toBe('New Name');
  });

  it('leaves non-matching palettes untouched', () => {
    savePalette(makePalette('p1'));
    savePalette(makePalette('p2', { name: 'Keep Me' }));
    updatePalette('p1', { name: 'Changed' });
    expect(loadSavedPalettes().find((p) => p.id === 'p2')!.name).toBe('Keep Me');
  });
});

describe('deletePalette', () => {
  it('removes the matching palette and persists the change', () => {
    savePalette(makePalette('p1'));
    savePalette(makePalette('p2'));
    const result = deletePalette('p1');
    expect(result.map((p) => p.id)).toEqual(['p2']);
    expect(loadSavedPalettes().map((p) => p.id)).toEqual(['p2']);
  });

  it('is a no-op when the id does not exist', () => {
    savePalette(makePalette('p1'));
    const result = deletePalette('does-not-exist');
    expect(result.map((p) => p.id)).toEqual(['p1']);
  });
});
