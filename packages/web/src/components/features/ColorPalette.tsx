import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal } from '../ui';
import { 
  exportAsPNG, 
  exportAsJSON, 
  exportAsASE, 
  exportAsCSS,
  exportAsAdobe,
  exportAsProcreate,
  downloadFile, 
  downloadTextFile 
} from '@/lib/export-formats';
import {
  rgbToHsl,
  rgbToLab,
  rgbToLch,
  rgbToOklch,
  formatColorValue
} from '@/lib/color-space-conversions';

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
  isAdded?: boolean;
}

interface SavedPalette {
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

interface ColorPaletteProps {
  colors: ExtractedColor[];
  className?: string;
  imageFilename?: string;
  isAddMode?: boolean;
  onToggleAddMode?: () => void;
  onFinishAdding?: () => void;
  onUndoLastAddition?: () => void;
  onDeleteColor?: (_colorIndex: number) => void;
}

export default function ColorPalette({
  colors,
  className = '',
  imageFilename,
  isAddMode = false,
  onToggleAddMode,
  onFinishAdding,
  onUndoLastAddition,
  onDeleteColor,
}: ColorPaletteProps) {
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(
    null
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [paletteName, setPaletteName] = useState('');
  const [paletteTags, setPaletteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const rgbToHex = (color: RGBColor): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !paletteTags.includes(trimmedTag)) {
      setPaletteTags([...paletteTags, trimmedTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setPaletteTags(paletteTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === ',' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    }
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
      tags: paletteTags.length > 0 ? paletteTags : undefined,
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
      setPaletteTags([]);
      setTagInput('');
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
        
        case 'adobe': {
          try {
            const acoBlob = exportAsAdobe(colors);
            downloadFile(acoBlob, `${baseFilename}.aco`);
          } catch (error) {
            console.error('Adobe Color export failed:', error);
          }
          break;
        }
        
        case 'procreate': {
          try {
            const swatchesBlob = exportAsProcreate(colors);
            downloadFile(swatchesBlob, `${baseFilename}.swatches`);
          } catch (error) {
            console.error('Procreate export failed:', error);
          }
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
          {/* Removed colors count display */}
        </CardHeader>
        <CardContent>
          {/* Color grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {colors.map((extractedColor, index) => {
              const hex = rgbToHex(extractedColor.color);

              return (
                <div
                  key={index}
                  className="group cursor-pointer relative"
                  onClick={() => setSelectedColor(extractedColor)}
                >
                  <div
                    className={`w-full aspect-square rounded-lg border-2 group-hover:scale-105 transition-transform shadow-sm ${
                      extractedColor.isAdded 
                        ? 'border-blue-400 border-dashed' 
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                  {extractedColor.isAdded && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      <span className="-translate-y-px">+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick copy section */}
          <div className="border-t border-gray-200 pt-4">
            {/* Add Mode Controls */}
            {isAddMode ? (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800 mb-2">
                  🎨 Add Mode: Select areas on the image to add more colors
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onFinishAdding}
                    className="bg-white"
                  >
                    Finish Adding
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUndoLastAddition}
                    className="bg-white"
                  >
                    Undo Last Addition
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleAddMode}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  + Add More Colors
                </Button>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
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
                    value={formatColorValue('hsl', rgbToHsl(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatColorValue('hsl', rgbToHsl(selectedColor.color)),
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
                    value={formatColorValue('lab', rgbToLab(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatColorValue('lab', rgbToLab(selectedColor.color)),
                        'LAB'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  LCH
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formatColorValue('lch', rgbToLch(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatColorValue('lch', rgbToLch(selectedColor.color)),
                        'LCH'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  OkLCH
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formatColorValue('oklch', rgbToOklch(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatColorValue('oklch', rgbToOklch(selectedColor.color)),
                        'OkLCH'
                      )
                    }
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete color action */}
            {onDeleteColor && (
              <div className="border-t border-gray-200 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const colorIndex = colors.findIndex(c => 
                      c.color.r === selectedColor.color.r &&
                      c.color.g === selectedColor.color.g &&
                      c.color.b === selectedColor.color.b
                    );
                    if (colorIndex !== -1 && onDeleteColor) {
                      onDeleteColor(colorIndex);
                      setSelectedColor(null);
                    }
                  }}
                  className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  Delete This Color
                </Button>
              </div>
            )}
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
              Choose a format to export your palette:
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

              {/* CSS Export */}
              <button
                onClick={() => handleExport('css')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">CSS Variables</div>
                <div className="text-sm text-gray-600">CSS custom properties</div>
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
            setPaletteTags([]);
            setTagInput('');
          }}
          title="Save Palette"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Give your palette a memorable name:
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

            <div>
              <label htmlFor="palette-tags" className="block text-sm font-medium text-black mb-2">
                Tags (optional)
              </label>
              <input
                id="palette-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyPress}
                placeholder="Enter tags separated by comma or press Enter..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Press Enter or comma to add tags
              </p>
              
              {paletteTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {paletteTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-gray-500 hover:text-gray-700"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  setPaletteTags([]);
                  setTagInput('');
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
