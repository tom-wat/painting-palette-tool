/**
 * Export utilities for color palettes in various formats
 */
import {
  type RGBColor,
  type ExtractedColor,
  getAllColorSpaces
} from '@palette-tool/color-engine';
import { drawAnnotationLabel, type AnnotationColorSpace } from './annotation-render';
import { ensureCanvasFontLoaded } from './canvas-font';
import { renderPaletteSheets } from './palette-card-image';
import { rgbToHex } from './palette-card-model';

export type { RGBColor, ExtractedColor };

export interface ColorAnnotation {
  id: string;
  anchorPoint: { x: number; y: number };
  labelPoint: { x: number; y: number };
  color: RGBColor;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: ExtractedColor[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  imageInfo?: {
    filename: string;
    selectionArea?: unknown;
  };
}

export interface ExportOptions {
  filename?: string;
  includeMetadata?: boolean;
  sortBy?: 'frequency' | 'brightness' | 'hue';
  includeAllColorSpaces?: boolean;
  /** Drawn above the swatches in a PNG export. */
  title?: string;
  /** PNG only: mirrors the panel's "Show Data" toggle. */
  showLabels?: boolean;
}

/** Re-exported: the swatch colour is part of the shared palette-card model. */
export { rgbToHex };


/**
 * Export palette as PNG image.
 *
 * Drawn onto a canvas by `palette-card-image`, which mirrors the panel's
 * layout, rather than screenshotted from the DOM.
 */
export async function exportAsPNG(
  colors: ExtractedColor[],
  options: ExportOptions = {}
): Promise<Blob> {
  return renderPaletteSheets([
    { colors, name: options.title, showLabels: options.showLabels },
  ]);
}

/**
 * Export several saved palettes stacked into a single PNG.
 */
export async function exportPalettesAsPNG(
  palettes: SavedPalette[],
  /** Per palette, since the panel's "Show Data" toggle is per palette too. */
  showLabels: (_palette: SavedPalette) => boolean = () => false
): Promise<Blob> {
  if (palettes.length === 0) throw new Error('No palettes to export');
  return renderPaletteSheets(
    palettes.map((palette) => ({
      colors: palette.colors,
      name: palette.name,
      tags: palette.tags,
      showLabels: showLabels(palette),
    }))
  );
}

/**
 * Export palette as JSON
 */
export function exportAsJSON(
  colors: ExtractedColor[],
  options: ExportOptions = {}
): string {
  const { includeMetadata = true, includeAllColorSpaces = false } = options;
  
  const exportData = {
    metadata: includeMetadata ? {
      format: 'Painting Palette Tool Export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      colorCount: colors.length,
    } : undefined,
    colors: colors.map((extractedColor, index) => {
      const baseColorData = {
        index: index + 1,
        rgb: {
          r: extractedColor.color.r,
          g: extractedColor.color.g,
          b: extractedColor.color.b,
        },
      };

      if (includeAllColorSpaces) {
        const allColorSpaces = getAllColorSpaces(extractedColor.color);
        return {
          ...baseColorData,
          hsl: allColorSpaces.hsl,
          lab: allColorSpaces.lab,
          lch: allColorSpaces.lch,
          oklch: allColorSpaces.oklch,
        };
      }

      return baseColorData;
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export saved palette with full information as JSON
 */
export function exportSavedPaletteAsJSON(
  palette: SavedPalette,
  options: ExportOptions = {}
): string {
  const { includeAllColorSpaces = false } = options;
  
  const exportData = {
    palette: {
      name: palette.name,
      tags: palette.tags || [],
    },
    colors: palette.colors.map((extractedColor, index) => {
      const baseColorData = {
        index: index + 1,
        rgb: {
          r: extractedColor.color.r,
          g: extractedColor.color.g,
          b: extractedColor.color.b,
        },
      };

      if (includeAllColorSpaces) {
        const allColorSpaces = getAllColorSpaces(extractedColor.color);
        return {
          ...baseColorData,
          hsl: allColorSpaces.hsl,
          lab: allColorSpaces.lab,
          lch: allColorSpaces.lch,
          oklch: allColorSpaces.oklch,
        };
      }

      return baseColorData;
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export palette as Adobe Swatch Exchange (ASE) format
 * Note: This is a simplified implementation for web compatibility
 */
export function exportAsASE(
  colors: ExtractedColor[],
  _options: ExportOptions = {}
): Blob {
  if (!colors || colors.length === 0) {
    throw new Error('No colors provided for ASE export');
  }
  
  // ASE file structure - properly formatted for Adobe compatibility
  const signature = 'ASEF';
  const version = [1, 0]; // Major version 1, minor version 0
  
  // Calculate total file size
  let totalSize = 12; // Header: signature(4) + version(4) + numBlocks(4)
  
  // Calculate each block size first
  const blockInfos = colors.map((extractedColor, index) => {
    const colorName = `Color ${index + 1}`;
    // Use UTF-16 BE for color names (Adobe standard)
    const nameUtf16 = [];
    for (let i = 0; i < colorName.length; i++) {
      const code = colorName.charCodeAt(i);
      nameUtf16.push((code >> 8) & 0xFF, code & 0xFF);
    }
    nameUtf16.push(0, 0); // null terminator
    
    return {
      name: colorName,
      nameBytes: new Uint8Array(nameUtf16),
      color: extractedColor.color
    };
  });
  
  // Calculate total size
  blockInfos.forEach(info => {
    totalSize += 6; // block type(2) + block length(4)
    totalSize += 2; // name length(2)
    totalSize += info.nameBytes.length; // name in UTF-16
    totalSize += 4; // color space(4) 'RGB '
    totalSize += 12; // RGB float values (3 × 4 bytes)
    totalSize += 2; // color type(2) - normal/spot/etc
  });
  
  // Create the ASE data buffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  let offset = 0;
  
  // Write header
  // Signature 'ASEF'
  for (let i = 0; i < 4; i++) {
    uint8View[offset++] = signature.charCodeAt(i);
  }
  
  // Version (big-endian) - 1.0
  view.setUint16(offset, version[0], false); // major version
  offset += 2;
  view.setUint16(offset, version[1], false); // minor version
  offset += 2;
  
  // Number of blocks
  view.setUint32(offset, colors.length, false);
  offset += 4;
  
  // Write color blocks
  blockInfos.forEach((info, _index) => {
    // Block type (0x0001 = Color entry)
    view.setUint16(offset, 0x0001, false);
    offset += 2;
    
    // Block length (everything after this field)
    const blockDataSize = 2 + info.nameBytes.length + 4 + 12 + 2;
    view.setUint32(offset, blockDataSize, false);
    offset += 4;
    
    // Name length (number of characters, not bytes)
    view.setUint16(offset, (info.nameBytes.length / 2), false);
    offset += 2;
    
    // Name in UTF-16 BE
    uint8View.set(info.nameBytes, offset);
    offset += info.nameBytes.length;
    
    // Color model 'RGB ' (4 bytes)
    const colorModel = 'RGB ';
    for (let i = 0; i < 4; i++) {
      uint8View[offset++] = colorModel.charCodeAt(i);
    }
    
    // RGB values as 32-bit floats (big-endian)
    view.setFloat32(offset, info.color.r / 255.0, false);
    offset += 4;
    view.setFloat32(offset, info.color.g / 255.0, false);
    offset += 4;
    view.setFloat32(offset, info.color.b / 255.0, false);
    offset += 4;
    
    // Color type (0x0000 = Global, 0x0001 = Spot, 0x0002 = Normal)
    view.setUint16(offset, 0x0002, false); // Normal color
    offset += 2;
  });
  
  const blob = new Blob([uint8View], { type: 'application/octet-stream' });
  return blob;
}

/**
 * Export multiple palettes as a single ASE file
 */
export function exportMultiplePalettesAsASE(
  palettes: SavedPalette[],
  _options: ExportOptions = {}
): Blob {
  if (!palettes || palettes.length === 0) {
    throw new Error('No palettes provided for ASE export');
  }

  // Flatten all colors from all palettes
  const allColors: ExtractedColor[] = [];
  palettes.forEach((palette) => {
    palette.colors.forEach((color, colorIndex) => {
      // Create a unique name for each color including palette name
      const colorWithName = {
        ...color,
        paletteName: palette.name,
        colorIndex: colorIndex + 1
      };
      allColors.push(colorWithName);
    });
  });

  // ASE file structure - properly formatted for Adobe compatibility
  const signature = 'ASEF';
  const version = [1, 0]; // Major version 1, minor version 0
  
  // Calculate total file size
  let totalSize = 12; // Header: signature(4) + version(4) + numBlocks(4)
  
  // Calculate each block size first
  const blockInfos = allColors.map((extractedColor, _index) => {
    const colorName = `${(extractedColor as any).paletteName} - Color ${(extractedColor as any).colorIndex}`;
    // Use UTF-16 BE for color names (Adobe standard)
    const nameUtf16 = [];
    for (let i = 0; i < colorName.length; i++) {
      const code = colorName.charCodeAt(i);
      nameUtf16.push((code >> 8) & 0xFF, code & 0xFF);
    }
    nameUtf16.push(0, 0); // null terminator
    
    return {
      name: colorName,
      nameBytes: new Uint8Array(nameUtf16),
      color: extractedColor.color
    };
  });
  
  // Calculate total size
  blockInfos.forEach(info => {
    totalSize += 6; // block type(2) + block length(4)
    totalSize += 2; // name length(2)
    totalSize += info.nameBytes.length; // name in UTF-16
    totalSize += 4; // color space(4) 'RGB '
    totalSize += 12; // RGB float values (3 × 4 bytes)
    totalSize += 2; // color type(2) - normal/spot/etc
  });
  
  // Create the ASE data buffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  let offset = 0;
  
  // Write header
  // Signature 'ASEF'
  for (let i = 0; i < 4; i++) {
    uint8View[offset++] = signature.charCodeAt(i);
  }
  
  // Version (big-endian) - 1.0
  view.setUint16(offset, version[0], false); // major version
  offset += 2;
  view.setUint16(offset, version[1], false); // minor version
  offset += 2;
  
  // Number of blocks
  view.setUint32(offset, allColors.length, false);
  offset += 4;
  
  // Write color blocks
  blockInfos.forEach((info, _index) => {
    // Block type (0x0001 = Color entry)
    view.setUint16(offset, 0x0001, false);
    offset += 2;
    
    // Block length (everything after this field)
    const blockDataSize = 2 + info.nameBytes.length + 4 + 12 + 2;
    view.setUint32(offset, blockDataSize, false);
    offset += 4;
    
    // Name length (number of characters, not bytes)
    view.setUint16(offset, (info.nameBytes.length / 2), false);
    offset += 2;
    
    // Name in UTF-16 BE
    uint8View.set(info.nameBytes, offset);
    offset += info.nameBytes.length;
    
    // Color model 'RGB ' (4 bytes)
    const colorModel = 'RGB ';
    for (let i = 0; i < 4; i++) {
      uint8View[offset++] = colorModel.charCodeAt(i);
    }
    
    // RGB values as 32-bit floats (big-endian)
    view.setFloat32(offset, info.color.r / 255.0, false);
    offset += 4;
    view.setFloat32(offset, info.color.g / 255.0, false);
    offset += 4;
    view.setFloat32(offset, info.color.b / 255.0, false);
    offset += 4;
    
    // Color type (0x0000 = Global, 0x0001 = Spot, 0x0002 = Normal)
    view.setUint16(offset, 0x0002, false); // Normal color
    offset += 2;
  });
  
  const blob = new Blob([uint8View], { type: 'application/octet-stream' });
  return blob;
}

/**
 * Export multiple palettes as a single CSS file
 */
export function exportMultiplePalettesAsCSS(
  palettes: SavedPalette[],
  _options: ExportOptions = {}
): string {
  if (!palettes || palettes.length === 0) {
    throw new Error('No palettes provided for CSS export');
  }

  let cssContent = '/* Combined Color Palettes */\n';
  cssContent += `/* Generated on ${new Date().toISOString()} */\n\n`;
  
  cssContent += ':root {\n';
  
  palettes.forEach((palette, paletteIndex) => {
    cssContent += `  /* Palette: ${palette.name} */\n`;
    
    palette.colors.forEach((extractedColor, colorIndex) => {
      const safePaletteName = palette.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const variableName = `--${safePaletteName}-color-${colorIndex + 1}`;
      const rgbValue = `${extractedColor.color.r}, ${extractedColor.color.g}, ${extractedColor.color.b}`;
      
      cssContent += `  ${variableName}: rgb(${rgbValue});\n`;
    });
    
    if (paletteIndex < palettes.length - 1) {
      cssContent += '\n';
    }
  });
  
  cssContent += '}\n';
  
  return cssContent;
}

/**
 * Export palette as CSS custom properties
 */
export function exportAsCSS(
  colors: ExtractedColor[],
  _options: ExportOptions = {}
): string {
  const cssVars = colors.map((extractedColor, index) => {
    const colorName = `color-${index + 1}`;
    const rgbValue = `${extractedColor.color.r}, ${extractedColor.color.g}, ${extractedColor.color.b}`;
    
    return `  --palette-${colorName}: rgb(${rgbValue});`;
  }).join('\n');
  
  return `:root {\n${cssVars}\n}`;
}

/**
 * Export palette as Adobe Color (.aco) format
 * ACO files use a binary format compatible with Adobe Photoshop and other Adobe products
 */
export function exportAsAdobe(
  colors: ExtractedColor[],
  _options: ExportOptions = {}
): Blob {
  if (!colors || colors.length === 0) {
    throw new Error('No colors provided for Adobe Color export');
  }

  // ACO file format structure (version 1):
  // Version (2 bytes) + Color count (2 bytes) + Color entries
  // Each color entry: Color space (2) + Color data (8 bytes)
  
  const version = 1;
  const colorCount = colors.length;
  
  // Calculate file size: version(2) + count(2) + (colorspace(2) + colordata(8)) * count
  const fileSize = 2 + 2 + (colors.length * 10);
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  let offset = 0;
  
  // File version (big-endian)
  view.setUint16(offset, version, false);
  offset += 2;
  
  // Color count (big-endian)
  view.setUint16(offset, colorCount, false);
  offset += 2;
  
  // Color entries
  colors.forEach((extractedColor) => {
    // Color space: 0 = RGB
    view.setUint16(offset, 0, false);
    offset += 2;
    
    // RGB values (16-bit each, big-endian)
    // Convert from 0-255 to 0-65535
    const r = Math.round((extractedColor.color.r / 255) * 65535);
    const g = Math.round((extractedColor.color.g / 255) * 65535);
    const b = Math.round((extractedColor.color.b / 255) * 65535);
    
    view.setUint16(offset, r, false);
    offset += 2;
    view.setUint16(offset, g, false);
    offset += 2;
    view.setUint16(offset, b, false);
    offset += 2;
    
    // Padding (2 bytes)
    view.setUint16(offset, 0, false);
    offset += 2;
  });
  
  return new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
}

/**
 * Export palette as Procreate (.swatches) format
 */
export function exportAsProcreate(
  colors: ExtractedColor[],
  _options: ExportOptions = {}
): Blob {
  if (!colors || colors.length === 0) {
    throw new Error('No colors provided for Procreate export');
  }

  // Procreate uses a JSON-based .swatches format
  const procreateData = {
    name: "Exported Palette",
    swatches: colors.map((extractedColor, index) => ({
      color: {
        red: extractedColor.color.r / 255.0,
        green: extractedColor.color.g / 255.0,
        blue: extractedColor.color.b / 255.0,
        alpha: 1.0
      },
      name: `Color ${index + 1}`,
      colorSpace: "sRGB"
    }))
  };
  
  const jsonContent = JSON.stringify(procreateData, null, 2);
  return new Blob([jsonContent], { type: 'application/json' });
}

/**
 * Export multiple palettes as Adobe Color (.aco) format
 */
export function exportMultiplePalettesAsAdobe(
  palettes: SavedPalette[],
  _options: ExportOptions = {}
): Blob {
  if (!palettes || palettes.length === 0) {
    throw new Error('No palettes provided for Adobe Color export');
  }

  // Flatten all colors from all palettes
  const allColors: ExtractedColor[] = [];
  palettes.forEach((palette) => {
    palette.colors.forEach((extractedColor) => {
      allColors.push(extractedColor);
    });
  });

  // ACO file format structure (version 1):
  // Version (2 bytes) + Color count (2 bytes) + Color entries
  // Each color entry: Color space (2) + Color data (8 bytes)
  
  const version = 1;
  const colorCount = allColors.length;
  
  // Calculate file size: version(2) + count(2) + (colorspace(2) + colordata(8)) * count
  const fileSize = 2 + 2 + (allColors.length * 10);
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  let offset = 0;
  
  // File version (big-endian)
  view.setUint16(offset, version, false);
  offset += 2;
  
  // Color count (big-endian)
  view.setUint16(offset, colorCount, false);
  offset += 2;
  
  // Color entries
  allColors.forEach((extractedColor) => {
    // Color space: 0 = RGB
    view.setUint16(offset, 0, false);
    offset += 2;
    
    // RGB values (16-bit each, big-endian)
    // Convert from 0-255 to 0-65535
    const r = Math.round((extractedColor.color.r / 255) * 65535);
    const g = Math.round((extractedColor.color.g / 255) * 65535);
    const b = Math.round((extractedColor.color.b / 255) * 65535);
    
    view.setUint16(offset, r, false);
    offset += 2;
    view.setUint16(offset, g, false);
    offset += 2;
    view.setUint16(offset, b, false);
    offset += 2;
    
    // Padding (2 bytes)
    view.setUint16(offset, 0, false);
    offset += 2;
  });
  
  return new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
}

/**
 * Export multiple palettes as Procreate format
 */
export function exportMultiplePalettesAsProcreate(
  palettes: SavedPalette[],
  _options: ExportOptions = {}
): Blob {
  if (!palettes || palettes.length === 0) {
    throw new Error('No palettes provided for Procreate export');
  }

  // Flatten all colors from all palettes
  const allSwatches = palettes.flatMap((palette) =>
    palette.colors.map((extractedColor, colorIndex) => ({
      color: {
        red: extractedColor.color.r / 255.0,
        green: extractedColor.color.g / 255.0,
        blue: extractedColor.color.b / 255.0,
        alpha: 1.0
      },
      name: `${palette.name} - Color ${colorIndex + 1}`,
      colorSpace: "sRGB"
    }))
  );

  const procreateData = {
    name: "Combined Palettes",
    swatches: allSwatches
  };
  
  const jsonContent = JSON.stringify(procreateData, null, 2);
  return new Blob([jsonContent], { type: 'application/json' });
}

/**
 * Export palette as SCSS variables
 */
export function exportAsSCSS(
  colors: ExtractedColor[],
  _options: ExportOptions = {}
): string {
  const scssVars = colors.map((extractedColor, index) => {
    const colorName = `color-${index + 1}`;
    const hex = rgbToHex(extractedColor.color);
    
    return `$palette-${colorName}: ${hex};`;
  }).join('\n');
  
  return `// Palette exported from Painting Palette Tool\n${scssVars}`;
}

/**
 * Download file utility
 */
async function tauriSaveFile(blob: Blob, filename: string): Promise<void> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  const path = await save({ defaultPath: filename });
  if (path) {
    const buffer = await blob.arrayBuffer();
    await writeFile(path, new Uint8Array(buffer));
  }
}

export function downloadFile(blob: Blob, filename: string): void {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    tauriSaveFile(blob, filename).catch(err => console.error('Save failed:', err));
    return;
  }
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
}

/**
 * Download text as file
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadFile(blob, filename);
}

function drawAnnotationsOnCtx(
  ctx: CanvasRenderingContext2D,
  annotations: ColorAnnotation[],
  canvasWidth: number,
  lineOpacity: number,
  fontSize: number,
  theme: 'light' | 'dark' = 'dark',
  lineColor: string = '#ffffff',
  colorSpace: AnnotationColorSpace = 'hscl'
) {
  for (const annotation of annotations) {
    drawAnnotationLabel(ctx, {
      color: annotation.color,
      anchor: annotation.anchorPoint,
      label: annotation.labelPoint,
      lineOpacity,
      fontSize,
      canvasWidth,
      theme,
      lineColor,
      colorSpace,
    });
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

/**
 * Export image with annotations as PNG (image + annotations at original resolution)
 */
export async function exportImageWithAnnotations(
  imageFile: File,
  annotations: ColorAnnotation[],
  options: { lineOpacity?: number; fontSize?: number; theme?: 'light' | 'dark'; lineColor?: string; colorSpace?: AnnotationColorSpace } = {}
): Promise<Blob> {
  const { lineOpacity = 0.7, fontSize = 16, theme = 'dark', lineColor = '#ffffff', colorSpace = 'hscl' } = options;
  await ensureCanvasFontLoaded();
  const img = await loadImage(imageFile);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');

  ctx.drawImage(img, 0, 0);
  drawAnnotationsOnCtx(ctx, annotations, canvas.width, lineOpacity, fontSize, theme, lineColor, colorSpace);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob'));
    }, 'image/png');
  });
}

/**
 * Export annotations only as PNG (transparent background, original resolution)
 */
export async function exportAnnotationsOnly(
  imageFile: File,
  annotations: ColorAnnotation[],
  options: { lineOpacity?: number; fontSize?: number; theme?: 'light' | 'dark'; lineColor?: string; colorSpace?: AnnotationColorSpace } = {}
): Promise<Blob> {
  const { lineOpacity = 0.7, fontSize = 16, theme = 'dark', lineColor = '#ffffff', colorSpace = 'hscl' } = options;
  await ensureCanvasFontLoaded();
  const img = await loadImage(imageFile);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');

  // Transparent background — do not fill
  drawAnnotationsOnCtx(ctx, annotations, canvas.width, lineOpacity, fontSize, theme, lineColor, colorSpace);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob'));
    }, 'image/png');
  });
}