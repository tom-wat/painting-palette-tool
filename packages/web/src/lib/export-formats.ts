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

export interface ExportOptions {
  filename?: string;
  includeMetadata?: boolean;
  sortBy?: 'frequency' | 'brightness' | 'hue';
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
  const { includeMetadata = true } = options;
  
  const exportData = {
    metadata: includeMetadata ? {
      format: 'Painting Palette Tool Export',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      colorCount: colors.length,
    } : undefined,
    colors: colors.map((extractedColor, index) => {
      const allColorSpaces = getAllColorSpaces(extractedColor.color);
      return {
        index: index + 1,
        hex: rgbToHex(extractedColor.color),
        rgb: {
          r: extractedColor.color.r,
          g: extractedColor.color.g,
          b: extractedColor.color.b,
        },
        hsl: allColorSpaces.hsl,
        lab: allColorSpaces.lab,
        lch: allColorSpaces.lch,
        oklch: allColorSpaces.oklch,
        frequency: parseFloat((extractedColor.frequency * 100).toFixed(2)),
        importance: parseFloat((extractedColor.importance * 100).toFixed(2)),
        representativeness: parseFloat((extractedColor.representativeness * 100).toFixed(2)),
      };
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
  
  // ASE file structure (simplified binary format)
  const signature = new TextEncoder().encode('ASEF'); // ASE signature
  
  let dataSize = 12; // Header size
  const colorBlocks: Uint8Array[] = [];
  
  colors.forEach((extractedColor, index) => {
    const colorName = `Color ${index + 1}`;
    const nameBuffer = new TextEncoder().encode(colorName);
    const nameLength = nameBuffer.length;
    
    // Color block structure
    const colorType = new TextEncoder().encode('RGB '); // RGB color space
    
    // Combine block data
    const blockData = new Uint8Array(2 + 4 + nameLength + 4 + 12);
    let offset = 0;
    
    // Block type
    new DataView(blockData.buffer).setUint16(offset, 0x0001, false);
    offset += 2;
    
    // Block length
    new DataView(blockData.buffer).setUint32(offset, nameLength + 2 + 4 + 12, false);
    offset += 4;
    
    // Name length
    new DataView(blockData.buffer).setUint16(offset, nameLength, false);
    offset += 2;
    
    // Name
    blockData.set(nameBuffer, offset);
    offset += nameLength;
    
    // Color type
    blockData.set(colorType, offset);
    offset += 4;
    
    // Color data
    new DataView(blockData.buffer).setFloat32(offset, extractedColor.color.r / 255, false);
    offset += 4;
    new DataView(blockData.buffer).setFloat32(offset, extractedColor.color.g / 255, false);
    offset += 4;
    new DataView(blockData.buffer).setFloat32(offset, extractedColor.color.b / 255, false);
    
    colorBlocks.push(blockData);
    dataSize += blockData.length;
  });
  
  // Create final ASE file
  const aseData = new Uint8Array(dataSize);
  let offset = 0;
  
  // Header
  aseData.set(signature, offset);
  offset += 4;
  
  new DataView(aseData.buffer).setUint32(offset, 0x00010000, false); // Version
  offset += 4;
  
  new DataView(aseData.buffer).setUint32(offset, colors.length, false); // Block count
  offset += 4;
  
  // Color blocks
  colorBlocks.forEach(block => {
    aseData.set(block, offset);
    offset += block.length;
  });
  
  return new Blob([aseData], { type: 'application/octet-stream' });
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
    const hex = rgbToHex(extractedColor.color);
    const rgb = `${extractedColor.color.r}, ${extractedColor.color.g}, ${extractedColor.color.b}`;
    
    return `  --palette-${colorName}: ${hex};\n  --palette-${colorName}-rgb: ${rgb};`;
  }).join('\n');
  
  return `:root {\n${cssVars}\n}`;
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download text as file
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadFile(blob, filename);
}