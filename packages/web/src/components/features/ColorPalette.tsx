import {
  calculateHScL,
  formatColorValue,
  rgbToHsl,
  rgbToLab,
  rgbToLch,
  rgbToOklch,
} from '@/lib/color-space-conversions';
import {
  downloadFile,
  downloadTextFile,
  exportAsAdobe,
  exportAsASE,
  exportAsCSS,
  exportAsJSON,
  exportAsPNG,
  exportAsProcreate,
} from '@/lib/export-formats';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Modal } from '../ui';

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
  id?: string;
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
  lastAddedColorIds?: Set<string>;
  onDeleteColor?: (_colorIndex: number) => void;
  onResetPalette?: () => void;
}

// Helper function to get bar color based on color space and type
const getBarColor = (
  colorSpace: 'hsl' | 'hscl',
  type: 'H' | 'S' | 'L' | 'Sc',
  value: number,
  color: RGBColor
) => {
  const hsl = rgbToHsl(color);
  const hscl = calculateHScL(color);

  switch (colorSpace) {
    case 'hsl':
      switch (type) {
        case 'H':
          return `hsl(${value}, 50%, 50%)`;
        case 'S':
          return `hsl(${hsl.h}, ${value}%, 60%)`;
        case 'L':
          return `hsl(${hsl.h}, 50%, 60%)`;
        default:
          return '#9ca3af'; // gray-400
      }

    case 'hscl':
      switch (type) {
        case 'H':
          return `hsl(${value}, 50%, 50%)`;
        case 'Sc':
          return `hsl(${hscl.h}, ${value}%, 60%)`;
        case 'L':
          return `hsl(${hscl.h}, 50%, 60%)`;
        default:
          return '#9ca3af'; // gray-400
      }

    default:
      return '#9ca3af'; // gray-400
  }
};

// Component for rendering horizontal bar graphs
const ColorValueBars = ({
  color,
  showLabels = false,
}: {
  color: ExtractedColor;
  showLabels?: boolean;
}) => {
  const hsl = rgbToHsl(color.color);
  const hscl = calculateHScL(color.color);

  const BarGraph = ({
    label,
    value,
    max,
    suffix = '',
    colorSpace,
    type,
  }: {
    label: string;
    value: number;
    max: number;
    suffix?: string;
    colorSpace: 'hsl' | 'hscl';
    type: 'H' | 'S' | 'L' | 'Sc';
  }) => (
    <div className={`text-[12px] ${showLabels ? 'space-y-0.5' : 'mb-1'}`}>
      {showLabels && (
        <div className="flex justify-between">
          <span className="text-gray-500 tracking-wide">{label}</span>
          <span className="text-gray-700 font-mono">
            {value}
            {suffix}
          </span>
        </div>
      )}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${Math.min((value / max) * 100, 100)}%`,
            backgroundColor: getBarColor(colorSpace, type, value, color.color),
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-1">
      {/* HSL Values */}
      {showLabels && (
        <div className="text-[12px] text-gray-500 font-medium mb-1">HSL</div>
      )}
      <div className="space-y-1">
        <BarGraph
          label="H"
          value={hsl.h}
          max={360}
          suffix="°"
          colorSpace="hsl"
          type="H"
        />
        <BarGraph
          label="S"
          value={hsl.s}
          max={100}
          suffix="%"
          colorSpace="hsl"
          type="S"
        />
        <BarGraph
          label="L"
          value={hsl.l}
          max={100}
          suffix="%"
          colorSpace="hsl"
          type="L"
        />
      </div>

      {/* HScL Values */}
      {showLabels && (
        <div className="text-[12px] text-gray-500 font-medium mb-1 mt-3">
          HScL
        </div>
      )}
      <div className={`space-y-1 ${!showLabels ? 'mt-3' : ''}`}>
        <BarGraph
          label="H"
          value={hscl.h}
          max={360}
          suffix="°"
          colorSpace="hscl"
          type="H"
        />
        <BarGraph
          label="Sc"
          value={hscl.sc}
          max={100}
          suffix="%"
          colorSpace="hscl"
          type="Sc"
        />
        <BarGraph
          label="L"
          value={hscl.l}
          max={100}
          suffix="%"
          colorSpace="hscl"
          type="L"
        />
      </div>
    </div>
  );
};

export default function ColorPalette({
  colors,
  className = '',
  imageFilename,
  lastAddedColorIds = new Set(),
  onDeleteColor,
  onResetPalette,
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
  const [showColorSpaceLabels, setShowColorSpaceLabels] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newly added colors
  useEffect(() => {
    if (lastAddedColorIds.size > 0 && scrollContainerRef.current) {
      // Find the first added color element
      const firstAddedId = Array.from(lastAddedColorIds)[0];
      const targetElement = scrollContainerRef.current.querySelector(
        `[data-color-id="${firstAddedId}"]`
      ) as HTMLElement;

      if (targetElement) {
        const container = scrollContainerRef.current;
        // Calculate scroll position: align element to bottom + padding-bottom (24px for pb-6)
        const paddingBottom = 24; // pb-6 = 1.5rem = 24px
        const scrollTarget =
          targetElement.offsetTop +
          targetElement.offsetHeight -
          container.clientHeight +
          paddingBottom;

        container.scrollTo({
          top: scrollTarget,
          behavior: 'smooth',
        });
      }
    }
  }, [lastAddedColorIds]);

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
    setPaletteTags(paletteTags.filter((tag) => tag !== tagToRemove));
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
      imageInfo: imageFilename
        ? {
            filename: imageFilename,
          }
        : undefined,
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
          downloadTextFile(
            jsonContent,
            `${baseFilename}.json`,
            'application/json'
          );
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

      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      setCopyFeedback('Export failed');
      setTimeout(() => setCopyFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Check if we have an uploaded image but no colors
  const hasUploadedImage = !!imageFilename;

  if (colors.length === 0) {
    return (
      <Card className={`${className} h-full flex flex-col`}>
        <CardHeader>
          <CardTitle>Extracted Color Palette</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="text-center py-8 text-gray-500">
            {hasUploadedImage ? (
              <>
                <div className="mb-2">No colors extracted yet</div>
                <div className="text-sm">
                  Select an area on the image or use Point mode to extract
                  colors
                </div>
              </>
            ) : (
              'Upload an image to extract colors'
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${className} h-full flex flex-col`}>
        <CardHeader>
          <CardTitle>Extracted Color Palette</CardTitle>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowColorSpaceLabels(!showColorSpaceLabels)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors min-h-[30px] flex items-center space-x-1"
                title={showColorSpaceLabels ? 'Hide data' : 'Show data'}
              >
                {showColorSpaceLabels ? 'Hide Data' : 'Show Data'}
              </button>
              <button
                onClick={onResetPalette}
                className="px-2 py-1 text-xs border border-red-200 rounded-md bg-white text-red-400 hover:bg-red-25 transition-colors min-h-[30px] flex items-center space-x-1"
              >
                Reset Palette
              </button>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors min-h-[30px] flex items-center space-x-1"
              >
                Save Palette
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors min-h-[30px] flex items-center space-x-1"
              >
                Export Palette
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          {/* Color grid with data below squares */}
          <div ref={scrollContainerRef} className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              {colors.map((extractedColor, index) => {
                const hex = rgbToHex(extractedColor.color);

                return (
                  <div
                    key={index}
                    data-color-id={extractedColor.id}
                    className="cursor-pointer text-center relative"
                    onClick={() => setSelectedColor(extractedColor)}
                  >
                    <div
                      className="aspect-square rounded border border-gray-200 shadow-sm mb-1 hover:scale-105 transition-transform"
                      style={{ backgroundColor: hex }}
                    />
                    {extractedColor.id &&
                      lastAddedColorIds.has(extractedColor.id) && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                          <span className="-translate-y-px">+</span>
                        </div>
                      )}
                    <ColorValueBars
                      color={extractedColor}
                      showLabels={showColorSpaceLabels}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Copy feedback section */}
          {copyFeedback && (
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-700 font-medium">
                {copyFeedback}
              </div>
            </div>
          )}
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
                    value={formatColorValue(
                      'hsl',
                      rgbToHsl(selectedColor.color)
                    )}
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
                    value={formatColorValue(
                      'lab',
                      rgbToLab(selectedColor.color)
                    )}
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
                    value={formatColorValue(
                      'lch',
                      rgbToLch(selectedColor.color)
                    )}
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
                    value={formatColorValue(
                      'oklch',
                      rgbToOklch(selectedColor.color)
                    )}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none border-l-0"
                    onClick={() =>
                      copyToClipboard(
                        formatColorValue(
                          'oklch',
                          rgbToOklch(selectedColor.color)
                        ),
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
                    const colorIndex = colors.findIndex(
                      (c) =>
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
                <div className="text-sm text-gray-600">
                  Visual palette grid for sharing
                </div>
              </button>

              {/* JSON Export */}
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">JSON Data</div>
                <div className="text-sm text-gray-600">
                  Complete color data with metadata
                </div>
              </button>

              {/* CSS Export */}
              <button
                onClick={() => handleExport('css')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">CSS Variables</div>
                <div className="text-sm text-gray-600">
                  CSS custom properties
                </div>
              </button>

              {/* ASE Export */}
              <button
                onClick={() => handleExport('ase')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">Adobe ASE</div>
                <div className="text-sm text-gray-600">
                  Adobe Swatch Exchange format
                </div>
              </button>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Preparing export...
                </span>
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
              <label
                htmlFor="palette-name"
                className="block text-sm font-medium text-black mb-2"
              >
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
              <label
                htmlFor="palette-tags"
                className="block text-sm font-medium text-black mb-2"
              >
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
