import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal } from '../ui';
import { 
  exportAsPNG, 
  exportAsJSON, 
  exportAsASE, 
  exportAsCSS, 
  exportAsSCSS,
  downloadFile, 
  downloadTextFile 
} from '@/lib/export-formats';

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface ExtractedColor {
  color: RGBColor;
  frequency: number;
  importance: number;
  representativeness: number;
}

interface SavedPalette {
  id: string;
  name: string;
  colors: ExtractedColor[];
  createdAt: string;
  updatedAt: string;
  imageInfo?: {
    filename: string;
    selectionArea?: unknown;
  };
}

interface ColorPaletteProps {
  colors: ExtractedColor[];
  className?: string;
  imageFilename?: string;
}

export default function ColorPalette({
  colors,
  className = '',
  imageFilename,
}: ColorPaletteProps) {
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(
    null
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [paletteName, setPaletteName] = useState('');

  const rgbToHex = (color: RGBColor): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };

  const calculateLuminance = (color: RGBColor): number => {
    const [r, g, b] = [color.r, color.g, color.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  // RGB to HSL conversion
  const rgbToHsl = (color: RGBColor): { h: number; s: number; l: number } => {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;

    const l = sum / 2;

    if (diff === 0) {
      return { h: 0, s: 0, l: Math.round(l * 100) };
    }

    const s = l > 0.5 ? diff / (2 - sum) : diff / sum;

    let h: number;
    switch (max) {
      case r:
        h = (g - b) / diff + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  // RGB to LAB conversion
  const rgbToLab = (color: RGBColor): { l: number; a: number; b: number } => {
    // Convert RGB to XYZ
    let r = color.r / 255;
    let g = color.g / 255;
    let b = color.b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ using sRGB matrix
    let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

    // Normalize by D65 illuminant
    x = x / 0.95047;
    y = y / 1.00000;
    z = z / 1.08883;

    // Convert XYZ to LAB
    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);

    return {
      l: Math.round(l * 10) / 10,
      a: Math.round(a * 10) / 10,
      b: Math.round(bLab * 10) / 10,
    };
  };

  // Format color values for display
  const formatHsl = (hsl: { h: number; s: number; l: number }): string => {
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  };

  const formatLab = (lab: { l: number; a: number; b: number }): string => {
    return `lab(${lab.l}%, ${lab.a}, ${lab.b})`;
  };

  // Get color temperature description
  const getColorTemperature = (hsl: { h: number; s: number; l: number }): string => {
    if (hsl.s < 10) return 'Neutral'; // Low saturation colors
    
    const h = hsl.h;
    if (h >= 0 && h < 60) return 'Warm (Red-Yellow)';
    if (h >= 60 && h < 120) return 'Cool-Warm (Yellow-Green)';
    if (h >= 120 && h < 180) return 'Cool (Green-Cyan)';
    if (h >= 180 && h < 240) return 'Cool (Cyan-Blue)';
    if (h >= 240 && h < 300) return 'Cool-Warm (Blue-Magenta)';
    if (h >= 300 && h < 360) return 'Warm (Magenta-Red)';
    return 'Neutral';
  };

  // Get saturation description
  const getSaturationLevel = (s: number): string => {
    if (s < 20) return 'Very Low';
    if (s < 40) return 'Low';
    if (s < 60) return 'Moderate';
    if (s < 80) return 'High';
    return 'Very High';
  };

  // Get Lab color characteristics
  const getLabCharacteristics = (lab: { l: number; a: number; b: number }): string => {
    const characteristics = [];
    
    if (lab.a > 10) characteristics.push('Red-tinted');
    else if (lab.a < -10) characteristics.push('Green-tinted');
    
    if (lab.b > 10) characteristics.push('Yellow-tinted');
    else if (lab.b < -10) characteristics.push('Blue-tinted');
    
    return characteristics.length > 0 ? characteristics.join(', ') : 'Neutral tint';
  };


  // Save palette to localStorage
  const savePalette = (name: string) => {
    if (!name.trim() || colors.length === 0) return;

    const newPalette: SavedPalette = {
      id: `palette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      colors: colors,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageInfo: imageFilename ? {
        filename: imageFilename,
      } : undefined,
    };

    try {
      const saved = localStorage.getItem('saved-palettes');
      const savedPalettes = saved ? JSON.parse(saved) : [];
      const updatedPalettes = [...savedPalettes, newPalette];
      localStorage.setItem('saved-palettes', JSON.stringify(updatedPalettes));
      
      // Dispatch custom event to notify SavedPalettesPanel
      window.dispatchEvent(new CustomEvent('palettes-updated'));
      
      setCopyFeedback(`Palette "${name}" saved successfully!`);
      setTimeout(() => setCopyFeedback(null), 3000);
      setShowSaveModal(false);
      setPaletteName('');
    } catch (error) {
      console.error('Failed to save palette:', error);
      setCopyFeedback('Failed to save palette');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${format} copied!`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const getLightnessCategory = (color: RGBColor): string => {
    const luminance = calculateLuminance(color);
    if (luminance > 0.7) return 'Light';
    if (luminance > 0.3) return 'Mid';
    return 'Dark';
  };

  // Export functions
  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `palette-${timestamp}`;

      switch (format) {
        case 'png': {
          const pngBlob = await exportAsPNG(colors);
          downloadFile(pngBlob, `${baseFilename}.png`);
          break;
        }
        
        case 'json': {
          const jsonContent = exportAsJSON(colors, { includeMetadata: true });
          downloadTextFile(jsonContent, `${baseFilename}.json`, 'application/json');
          break;
        }
        
        case 'ase': {
          const aseBlob = exportAsASE(colors);
          downloadFile(aseBlob, `${baseFilename}.ase`);
          break;
        }
        
        case 'css': {
          const cssContent = exportAsCSS(colors);
          downloadTextFile(cssContent, `${baseFilename}.css`, 'text/css');
          break;
        }
        
        case 'scss': {
          const scssContent = exportAsSCSS(colors);
          downloadTextFile(scssContent, `${baseFilename}.scss`, 'text/scss');
          break;
        }
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      setCopyFeedback(`Exported as ${format.toUpperCase()}`);
      setTimeout(() => setCopyFeedback(null), 3000);
      setShowExportModal(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      setCopyFeedback('Export failed');
      setTimeout(() => setCopyFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  if (colors.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Upload an image to extract colors
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Extracted Color Palette</CardTitle>
          <p className="text-gray-600 text-sm">
            {colors.length} colors extracted
          </p>
        </CardHeader>
        <CardContent>
          {/* Color grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {colors.map((extractedColor, index) => {
              const hex = rgbToHex(extractedColor.color);
              const luminance = calculateLuminance(extractedColor.color);
              const textColor = luminance > 0.5 ? 'text-black' : 'text-white';

              return (
                <div
                  key={index}
                  className="group cursor-pointer"
                  onClick={() => setSelectedColor(extractedColor)}
                >
                  <div
                    className="w-full aspect-square rounded-lg border border-gray-200 group-hover:scale-105 transition-transform shadow-sm"
                    style={{ backgroundColor: hex }}
                  >
                    <div
                      className={`w-full h-full rounded-lg flex flex-col justify-end p-2 ${textColor}`}
                    >
                      <div className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {hex.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium text-black">
                      {hex.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getLightnessCategory(extractedColor.color)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick copy section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const hexColors = colors
                    .map((c) => rgbToHex(c.color))
                    .join(', ');
                  copyToClipboard(hexColors, 'All HEX colors');
                }}
              >
                Copy All HEX
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const rgbColors = colors
                    .map((c) => `rgb(${c.color.r}, ${c.color.g}, ${c.color.b})`)
                    .join(', ');
                  copyToClipboard(rgbColors, 'All RGB colors');
                }}
              >
                Copy All RGB
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const hslColors = colors
                    .map((c) => formatHsl(rgbToHsl(c.color)))
                    .join(', ');
                  copyToClipboard(hslColors, 'All HSL colors');
                }}
              >
                Copy All HSL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const labColors = colors
                    .map((c) => formatLab(rgbToLab(c.color)))
                    .join(', ');
                  copyToClipboard(labColors, 'All LAB colors');
                }}
              >
                Copy All LAB
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveModal(true)}
              >
                Save Palette
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(true)}
              >
                Export Palette
              </Button>
            </div>

            {copyFeedback && (
              <div className="mt-2 text-sm text-gray-700 font-medium">{copyFeedback}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Color detail modal */}
      {selectedColor && (
        <Modal
          isOpen={!!selectedColor}
          onClose={() => setSelectedColor(null)}
          title="Color Details"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            {/* Color preview */}
            <div
              className="w-full h-32 rounded-lg border border-gray-200"
              style={{ backgroundColor: rgbToHex(selectedColor.color) }}
            />

            {/* Color values */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  HEX
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={rgbToHex(selectedColor.color).toUpperCase()}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(rgbToHex(selectedColor.color), 'HEX')
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  RGB
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={`rgb(${selectedColor.color.r}, ${selectedColor.color.g}, ${selectedColor.color.b})`}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        `rgb(${selectedColor.color.r}, ${selectedColor.color.g}, ${selectedColor.color.b})`,
                        'RGB'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  HSL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formatHsl(rgbToHsl(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatHsl(rgbToHsl(selectedColor.color)),
                        'HSL'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  LAB
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formatLab(rgbToLab(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatLab(rgbToLab(selectedColor.color)),
                        'LAB'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            {/* Color characteristics */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-black mb-2">Color Characteristics</h4>
              {(() => {
                const hsl = rgbToHsl(selectedColor.color);
                const lab = rgbToLab(selectedColor.color);
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Temperature:</span>
                      <span className="font-medium">
                        {getColorTemperature(hsl)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Saturation:</span>
                      <span className="font-medium">
                        {getSaturationLevel(hsl.s)} ({hsl.s}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Lab Tint:</span>
                      <span className="font-medium">
                        {getLabCharacteristics(lab)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Color metrics */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-black mb-2">Extraction Data</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Frequency:</span>
                <span className="font-medium">
                  {(selectedColor.frequency * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Importance:</span>
                <span className="font-medium">
                  {(selectedColor.importance * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Lightness:</span>
                <span className="font-medium">
                  {getLightnessCategory(selectedColor.color)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Relative Luminance:</span>
                <span className="font-medium">
                  {(calculateLuminance(selectedColor.color) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Export modal */}
      {showExportModal && (
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Palette"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose a format to export your {colors.length} color palette:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              {/* PNG Export */}
              <button
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">PNG Image</div>
                <div className="text-sm text-gray-600">Visual palette grid for sharing</div>
              </button>

              {/* JSON Export */}
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">JSON Data</div>
                <div className="text-sm text-gray-600">Complete color data with metadata</div>
              </button>

              {/* ASE Export */}
              <button
                onClick={() => handleExport('ase')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">Adobe ASE</div>
                <div className="text-sm text-gray-600">Adobe Swatch Exchange format</div>
              </button>

              {/* CSS Export */}
              <button
                onClick={() => handleExport('css')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">CSS Variables</div>
                <div className="text-sm text-gray-600">CSS custom properties</div>
              </button>

              {/* SCSS Export */}
              <button
                onClick={() => handleExport('scss')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">SCSS Variables</div>
                <div className="text-sm text-gray-600">Sass/SCSS variable definitions</div>
              </button>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <span className="ml-2 text-sm text-gray-600">Preparing export...</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Save palette modal */}
      {showSaveModal && (
        <Modal
          isOpen={showSaveModal}
          onClose={() => {
            setShowSaveModal(false);
            setPaletteName('');
          }}
          title="Save Palette"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Give your {colors.length} color palette a memorable name:
            </p>
            
            <div>
              <label htmlFor="palette-name" className="block text-sm font-medium text-black mb-2">
                Palette Name
              </label>
              <input
                id="palette-name"
                type="text"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder="Enter palette name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && paletteName.trim()) {
                    savePalette(paletteName);
                  }
                }}
                autoFocus
              />
            </div>

            {imageFilename && (
              <div className="text-sm text-gray-500">
                From image: {imageFilename}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveModal(false);
                  setPaletteName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => savePalette(paletteName)}
                disabled={!paletteName.trim()}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Palette
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
}
