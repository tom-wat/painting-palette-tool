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

interface ColorPaletteProps {
  colors: ExtractedColor[];
  className?: string;
}

export default function ColorPalette({
  colors,
  className = '',
}: ColorPaletteProps) {
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(
    null
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
            </div>

            {/* Color metrics */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
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
                <span className="text-gray-600">Luminance:</span>
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
    </>
  );
}
