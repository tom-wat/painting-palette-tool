import {
  type RGBColor,
  type ExtractedColor,
  formatColorValue,
  rgbToHsl,
  rgbToLab,
  rgbToLch,
  rgbToOklch,
} from '@palette-tool/color-engine';
import { type SavedPalette } from '@/lib/export-formats';
import { savePalette as persistPalette } from '@/lib/palette-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '../ui';
import { cn } from '@/lib/cn';
import { ColorValueBars } from './color-palette/ColorValueBars';
import { usePaletteExport } from '@/hooks/usePaletteExport';

interface ColorPaletteProps {
  colors: ExtractedColor[];
  className?: string;
  imageFilename?: string;
  lastAddedColorIds?: Set<string>;
  onDeleteColor?: (_colorIndex: number) => void;
  onResetPalette?: () => void;
}

// Helper function to get swatch border class based on color brightness
const getSwatchBorderClass = (color: RGBColor): string => {
  const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
  if (brightness > 220) return 'border border-input';
  if (brightness < 30) return 'border border-input';
  return 'border border-border';
};

/**
 * Panel chrome shared with the left-hand sections: a bordered title row, no
 * card frame of its own — AppShell's sidebar supplies the outer border.
 */
function PanelHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold">Extracted Color Palette</h2>
      {children}
    </div>
  );
}

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
  const [showColorSpaceLabels, setShowColorSpaceLabels] = useState(true);
  const { isExporting, handleExport: handleExportAction } = usePaletteExport(
    colors,
    showColorSpaceLabels
  );
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [paletteName, setPaletteName] = useState('');
  const [paletteTags, setPaletteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
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

  // Save palette to storage
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
      persistPalette(newPalette);

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

  // Export current palette (closes the export modal on success; shows a
  // copy-feedback message on failure — matches the original inline
  // behavior of handleExport).
  const handleExport = (format: string) =>
    handleExportAction(
      format,
      () => setShowExportModal(false),
      () => {
        setCopyFeedback('Export failed');
        setTimeout(() => setCopyFeedback(null), 3000);
      }
    );

  // Check if we have an uploaded image but no colors
  const hasUploadedImage = !!imageFilename;

  if (colors.length === 0) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <PanelHeader />
        <div className="flex-1 px-4 py-8 text-center text-sm text-muted-foreground">
          {hasUploadedImage ? (
            <>
              <div className="mb-2">No colors extracted yet</div>
              <div className="text-xs">
                Select an area on the image or use Point mode to extract colors
              </div>
            </>
          ) : (
            'Upload an image to extract colors'
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('flex h-full flex-col', className)}>
        <PanelHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorSpaceLabels(!showColorSpaceLabels)}
              title={showColorSpaceLabels ? 'Hide data' : 'Show data'}
            >
              {showColorSpaceLabels ? 'Hide Data' : 'Show Data'}
            </Button>
            <Button variant="destructive" size="sm" onClick={onResetPalette}>
              Reset Palette
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSaveModal(true)}>
              Save Palette
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
              Export Palette
            </Button>
          </div>
        </PanelHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Color grid with data below squares */}
          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto p-4">
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
                      className={`aspect-square rounded shadow-sm mb-1 hover:scale-105 transition-transform ${getSwatchBorderClass(extractedColor.color)}`}
                      style={{ backgroundColor: hex }}
                    />
                    {extractedColor.id &&
                      lastAddedColorIds.has(extractedColor.id) && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-foreground text-primary-foreground text-xs rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
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
            <div className="pt-4">
              <div className="text-sm text-foreground font-medium">
                {copyFeedback}
              </div>
            </div>
          )}
        </div>
      </div>

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
              className={`w-full h-32 rounded-lg ${getSwatchBorderClass(selectedColor.color)}`}
              style={{ backgroundColor: rgbToHex(selectedColor.color) }}
            />

            {/* Color values */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  HEX
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={rgbToHex(selectedColor.color).toUpperCase()}
                    readOnly
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
                <label className="block text-sm font-medium text-foreground mb-1">
                  RGB
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={`rgb(${selectedColor.color.r}, ${selectedColor.color.g}, ${selectedColor.color.b})`}
                    readOnly
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
              <div className="pt-4">
                <Button
                  variant="destructive"
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
                  className="w-full"
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
            <p className="text-sm text-muted-foreground">
              Choose a format to export your palette:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* PNG Export */}
              <button
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-foreground">PNG Image</div>
                <div className="text-sm text-muted-foreground">
                  Visual palette grid for sharing
                </div>
              </button>

              {/* JSON Export */}
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-foreground">JSON Data</div>
                <div className="text-sm text-muted-foreground">
                  Complete color data with metadata
                </div>
              </button>

              {/* CSS Export */}
              <button
                onClick={() => handleExport('css')}
                disabled={isExporting}
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-foreground">CSS Variables</div>
                <div className="text-sm text-muted-foreground">
                  CSS custom properties
                </div>
              </button>

              {/* ASE Export */}
              <button
                onClick={() => handleExport('ase')}
                disabled={isExporting}
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-foreground">Adobe ASE</div>
                <div className="text-sm text-muted-foreground">
                  Adobe Swatch Exchange format
                </div>
              </button>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">
              Give your palette a memorable name:
            </p>

            <div>
              <label
                htmlFor="palette-name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Palette Name
              </label>
              <input
                id="palette-name"
                type="text"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder="Enter palette name..."
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
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
                className="block text-sm font-medium text-foreground mb-2"
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
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter or comma to add tags
              </p>

              {paletteTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {paletteTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-muted text-foreground rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
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
              <div className="text-sm text-muted-foreground">
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
