// @vitest-environment node
//
// Node's native Blob implements arrayBuffer()/text(); jsdom's Blob does not.
// None of the functions under test here touch the DOM, so the node
// environment is used for this file only.
import { describe, it, expect } from 'vitest';
import {
  rgbToHex,
  exportAsJSON,
  exportSavedPaletteAsJSON,
  exportAsASE,
  exportMultiplePalettesAsASE,
  exportMultiplePalettesAsCSS,
  exportAsCSS,
  exportAsAdobe,
  exportAsProcreate,
  exportMultiplePalettesAsAdobe,
  exportMultiplePalettesAsProcreate,
  exportAsSCSS,
  type ExtractedColor,
  type SavedPalette,
} from './export-formats';

const red: ExtractedColor = {
  color: { r: 255, g: 0, b: 0 },
  frequency: 0.5,
  importance: 0.8,
  representativeness: 0.9,
};
const blue: ExtractedColor = {
  color: { r: 0, g: 0, b: 255 },
  frequency: 0.3,
  importance: 0.6,
  representativeness: 0.7,
};

function makePalette(name: string, colors: ExtractedColor[]): SavedPalette {
  return {
    id: 'p1',
    name,
    colors,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('rgbToHex', () => {
  it('formats colors as lowercase hex', () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });
});

describe('exportAsJSON', () => {
  it('includes metadata by default', () => {
    const json = JSON.parse(exportAsJSON([red, blue]));
    expect(json.metadata.format).toBe('Painting Palette Tool Export');
    expect(json.metadata.colorCount).toBe(2);
    expect(json.colors).toHaveLength(2);
    expect(json.colors[0]).toEqual({ index: 1, rgb: { r: 255, g: 0, b: 0 } });
  });

  it('omits metadata when includeMetadata is false', () => {
    const json = JSON.parse(exportAsJSON([red], { includeMetadata: false }));
    expect(json.metadata).toBeUndefined();
  });

  it('includes all color spaces when requested', () => {
    const json = JSON.parse(
      exportAsJSON([red], { includeAllColorSpaces: true })
    );
    expect(json.colors[0]).toHaveProperty('hsl');
    expect(json.colors[0]).toHaveProperty('lab');
    expect(json.colors[0]).toHaveProperty('lch');
    expect(json.colors[0]).toHaveProperty('oklch');
  });
});

describe('exportSavedPaletteAsJSON', () => {
  it('serializes palette name, tags, and colors', () => {
    const palette = makePalette('My Palette', [red]);
    const json = JSON.parse(exportSavedPaletteAsJSON(palette));
    expect(json.palette.name).toBe('My Palette');
    expect(json.palette.tags).toEqual([]);
    expect(json.colors).toHaveLength(1);
  });
});

describe('exportAsASE', () => {
  it('produces a blob with the ASEF signature', async () => {
    const blob = exportAsASE([red, blue]);
    expect(blob.type).toBe('application/octet-stream');
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const signature = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    expect(signature).toBe('ASEF');
    expect(view.getUint32(8, false)).toBe(2); // number of blocks
  });

  it('throws for an empty color list', () => {
    expect(() => exportAsASE([])).toThrow();
  });
});

describe('exportMultiplePalettesAsASE', () => {
  it('flattens all palette colors into one ASE file', async () => {
    const blob = exportMultiplePalettesAsASE([
      makePalette('A', [red]),
      makePalette('B', [blue, red]),
    ]);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    expect(view.getUint32(8, false)).toBe(3);
  });

  it('throws for an empty palette list', () => {
    expect(() => exportMultiplePalettesAsASE([])).toThrow();
  });
});

describe('exportAsCSS / exportMultiplePalettesAsCSS', () => {
  it('emits :root custom properties for a single palette', () => {
    const css = exportAsCSS([red, blue]);
    expect(css).toContain(':root {');
    expect(css).toContain('--palette-color-1: rgb(255, 0, 0);');
    expect(css).toContain('--palette-color-2: rgb(0, 0, 255);');
  });

  it('namespaces variables by palette name for multiple palettes', () => {
    const css = exportMultiplePalettesAsCSS([makePalette('Sunset', [red])]);
    expect(css).toContain('--sunset-color-1: rgb(255, 0, 0);');
  });

  it('throws for an empty palette list', () => {
    expect(() => exportMultiplePalettesAsCSS([])).toThrow();
  });
});

describe('exportAsSCSS', () => {
  it('emits $palette-color-N variables using hex values', () => {
    const scss = exportAsSCSS([red]);
    expect(scss).toContain('$palette-color-1: #ff0000;');
  });
});

describe('exportAsAdobe / exportMultiplePalettesAsAdobe', () => {
  it('writes an ACO header with version and color count', async () => {
    const blob = exportAsAdobe([red, blue]);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    expect(view.getUint16(0, false)).toBe(1); // version
    expect(view.getUint16(2, false)).toBe(2); // color count
  });

  it('throws for an empty color list', () => {
    expect(() => exportAsAdobe([])).toThrow();
  });

  it('flattens multiple palettes into one ACO file', async () => {
    const blob = exportMultiplePalettesAsAdobe([
      makePalette('A', [red]),
      makePalette('B', [blue]),
    ]);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    expect(view.getUint16(2, false)).toBe(2);
  });
});

describe('exportAsProcreate / exportMultiplePalettesAsProcreate', () => {
  it('produces normalized 0-1 color swatches', async () => {
    const blob = exportAsProcreate([red]);
    const text = await blob.text();
    const data = JSON.parse(text);
    expect(data.swatches[0].color).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
  });

  it('throws for an empty color list', () => {
    expect(() => exportAsProcreate([])).toThrow();
  });

  it('combines multiple palettes into one swatches file', async () => {
    const blob = exportMultiplePalettesAsProcreate([
      makePalette('A', [red]),
      makePalette('B', [blue]),
    ]);
    const text = await blob.text();
    const data = JSON.parse(text);
    expect(data.swatches).toHaveLength(2);
    expect(data.swatches[0].name).toBe('A - Color 1');
  });
});
