/**
 * Export utilities for color palettes in various formats
 */
import {
  getAllColorSpaces,
  rgbToHsl,
  calculateHScL,
  formatColorValue
} from './color-space-conversions';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ExtractedColor {
  color: RGBColor;
  frequency: number;
  importance: number;
  representativeness: number;
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
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(color: RGBColor): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}


/**
 * Export palette as PNG image
 */
export async function exportAsPNG(
  colors: ExtractedColor[],
  _options: ExportOptions = {}
): Promise<Blob> {
  
  // Create canvas for palette
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');

  // Calculate canvas dimensions (horizontal layout, 75% size)
  const baseScale = 2; // Base scale for quality
  const sizeScale = 0.75; // 75% size reduction
  const scale = baseScale * sizeScale; // Combined scale (1.5x)
  const colorCount = colors.length;
  const colorsPerRow = colorCount; // All colors in one row
  const rows = 1; // Single row
  const colorSize = 100 * scale; // 75% of original size
  const textHeight = 60 * scale; // 75% text space
  const itemGap = 16 * scale; // 75% gaps (but proportionally wider)
  const itemWidth = colorSize;
  const itemHeight = colorSize + textHeight;
  const padding = 24 * scale; // 75% padding
  
  canvas.width = colorsPerRow * itemWidth + (colorsPerRow - 1) * itemGap + (padding * 2);
  canvas.height = rows * itemHeight + (rows - 1) * itemGap + (padding * 2);

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set font properties (scaled for better quality)
  ctx.font = `${12 * scale}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Draw colors with text labels (SavedPalettes style)
  colors.forEach((extractedColor, index) => {
    const row = Math.floor(index / colorsPerRow);
    const col = index % colorsPerRow;
    
    const x = padding + col * (itemWidth + itemGap);
    const y = padding + row * (itemHeight + itemGap);
    
    // Draw color square with rounded corners effect (scaled)
    const cornerRadius = 6 * scale; // Scaled corner radius
    ctx.fillStyle = rgbToHex(extractedColor.color);
    
    // Use roundRect for better quality rounded corners
    ctx.beginPath();
    ctx.roundRect(x, y, colorSize, colorSize, cornerRadius);
    ctx.fill();
    
    // No border
    
    // Calculate color values (excluding LCH)
    const hsl = rgbToHsl(extractedColor.color);
    const hscl = calculateHScL(extractedColor.color);
    
    // Draw text labels (HSL and HScL only)
    ctx.fillStyle = '#6b7280'; // gray-500
    const textX = x + colorSize / 2;
    const textStartY = y + colorSize + (8 * scale); // Scaled text spacing
    const lineHeight = 18 * scale; // Scaled line height
    
    // HSL line
    ctx.fillText(formatColorValue('hsl', hsl), textX, textStartY);
    
    // HScL line
    ctx.fillText(formatColorValue('hscl', hscl), textX, textStartY + lineHeight);
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        throw new Error('Failed to create PNG blob');
      }
    }, 'image/png');
  });
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
export function downloadFile(blob: Blob, filename: string): void {
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