import React, { useState, useEffect } from 'react';
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
import {
  rgbToHsl,
  rgbToLab,
  rgbToLch,
  rgbToOklch,
  calculateHScL,
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

interface SavedPalettesPanelProps {
  className?: string;
  onLoadPalette?: (_palette: SavedPalette) => void;
}

export default function SavedPalettesPanel({
  className = '',
  onLoadPalette,
}: SavedPalettesPanelProps) {
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<SavedPalette | null>(null);
  const [showColorDetailModal, setShowColorDetailModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Helper function to convert RGB to HEX
  const rgbToHex = (color: RGBColor): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };


  // Get color temperature description
  const getColorTemperature = (hsl: { h: number; s: number; l: number }): string => {
    if (hsl.s < 10) return 'Neutral';
    
    const h = hsl.h;
    if (h >= 0 && h < 60) return 'Warm (Red-Yellow)';
    if (h >= 60 && h < 120) return 'Cool-Warm (Yellow-Green)';
    if (h >= 120 && h < 180) return 'Cool (Green-Cyan)';
    if (h >= 180 && h < 240) return 'Cool (Cyan-Blue)';
    if (h >= 240 && h < 300) return 'Cool-Warm (Blue-Magenta)';
    if (h >= 300 && h < 360) return 'Warm (Magenta-Red)';
    return 'Neutral';
  };



  // Copy to clipboard function
  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(`${format} copied!`);
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback('Failed to copy');
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // Export single palette
  const handleExportPalette = async (format: string, palette: SavedPalette) => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${palette.name}-${timestamp}`;

      switch (format) {
        case 'png': {
          const pngBlob = await exportAsPNG(palette.colors);
          downloadFile(pngBlob, `${baseFilename}.png`);
          break;
        }
        
        case 'json': {
          const jsonContent = exportAsJSON(palette.colors, { includeMetadata: true });
          downloadTextFile(jsonContent, `${baseFilename}.json`, 'application/json');
          break;
        }
        
        case 'ase': {
          const aseBlob = exportAsASE(palette.colors);
          downloadFile(aseBlob, `${baseFilename}.ase`);
          break;
        }
        
        case 'css': {
          const cssContent = exportAsCSS(palette.colors);
          downloadTextFile(cssContent, `${baseFilename}.css`, 'text/css');
          break;
        }
        
        case 'scss': {
          const scssContent = exportAsSCSS(palette.colors);
          downloadTextFile(scssContent, `${baseFilename}.scss`, 'text/scss');
          break;
        }
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      setFeedback(`Exported ${palette.name} as ${format.toUpperCase()}`);
      setTimeout(() => setFeedback(null), 3000);
      setShowExportModal(false);
      
    } catch (error) {
      console.error('Export failed:', error);
      setFeedback('Export failed');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export all palettes
  const handleBulkExport = async (format: string) => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `all-palettes-${timestamp}`;

      if (format === 'json') {
        const bulkData = {
          exportDate: new Date().toISOString(),
          totalPalettes: savedPalettes.length,
          palettes: savedPalettes
        };
        const jsonContent = JSON.stringify(bulkData, null, 2);
        downloadTextFile(jsonContent, `${baseFilename}.json`, 'application/json');
      } else {
        // For other formats, export each palette separately
        for (let i = 0; i < savedPalettes.length; i++) {
          const palette = savedPalettes[i];
          const filename = `${palette.name}-${timestamp}`;
          
          switch (format) {
            case 'png': {
              const pngBlob = await exportAsPNG(palette.colors);
              downloadFile(pngBlob, `${filename}.png`);
              break;
            }
            case 'ase': {
              const aseBlob = await exportAsASE(palette.colors);
              downloadFile(aseBlob, `${filename}.ase`);
              break;
            }
            case 'css': {
              const cssContent = exportAsCSS(palette.colors);
              downloadTextFile(cssContent, `${filename}.css`, 'text/css');
              break;
            }
            case 'scss': {
              const scssContent = exportAsSCSS(palette.colors);
              downloadTextFile(scssContent, `${filename}.scss`, 'text/scss');
              break;
            }
          }
          
          // Small delay to prevent browser blocking multiple downloads
          if (i < savedPalettes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      setFeedback(`Exported ${savedPalettes.length} palettes as ${format.toUpperCase()}`);
      setTimeout(() => setFeedback(null), 3000);
      setShowBulkExportModal(false);
      
    } catch (error) {
      console.error('Bulk export failed:', error);
      setFeedback('Bulk export failed');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Load saved palettes from localStorage
  useEffect(() => {
    const loadPalettes = () => {
      try {
        const saved = localStorage.getItem('saved-palettes');
        if (saved) {
          const palettes = JSON.parse(saved);
          setSavedPalettes(palettes.sort((a: SavedPalette, b: SavedPalette) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
      } catch (error) {
        console.error('Failed to load saved palettes:', error);
      }
    };

    loadPalettes();

    // Listen for storage changes (when palettes are saved from ColorPalette component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'saved-palettes') {
        loadPalettes();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from the same page
    const handleCustomUpdate = () => {
      loadPalettes();
    };
    
    window.addEventListener('palettes-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('palettes-updated', handleCustomUpdate);
    };
  }, []);

  // Delete palette
  const deletePalette = (paletteId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail modal
    
    try {
      const updatedPalettes = savedPalettes.filter(p => p.id !== paletteId);
      setSavedPalettes(updatedPalettes);
      localStorage.setItem('saved-palettes', JSON.stringify(updatedPalettes));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('palettes-updated'));
      
      setFeedback('Palette deleted');
      setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      console.error('Failed to delete palette:', error);
      setFeedback('Failed to delete palette');
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // Load palette (if callback provided)
  const loadPalette = (palette: SavedPalette) => {
    if (onLoadPalette) {
      onLoadPalette(palette);
      setFeedback(`Loaded palette: ${palette.name}`);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  // Show palette details
  const showPaletteDetails = (palette: SavedPalette) => {
    setSelectedPalette(palette);
    setShowDetailModal(true);
  };

  if (savedPalettes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Saved Palettes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <div className="mb-2">No saved palettes yet</div>
            <div className="text-sm">Save palettes to see them here</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Saved Palettes ({savedPalettes.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkExportModal(true)}
              disabled={savedPalettes.length === 0}
            >
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savedPalettes.map((palette) => (
              <div
                key={palette.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => showPaletteDetails(palette)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-black text-sm mb-2 truncate">
                      {palette.name}
                    </h4>
                    
                    {/* Color preview grid with data below squares */}
                    <div className="grid grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-1 mb-3">
                      {palette.colors.slice(0, 16).map((color, idx) => {
                        const hex = rgbToHex(color.color);
                        const hsl = rgbToHsl(color.color);
                        const lch = rgbToLch(color.color);
                        const hscl = calculateHScL(color.color);
                        
                        return (
                          <div
                            key={idx}
                            className="cursor-pointer text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColor(color);
                              setShowColorDetailModal(true);
                            }}
                          >
                            <div
                              className="aspect-square rounded border border-gray-200 shadow-sm mb-1"
                              style={{ backgroundColor: hex }}
                            />
                            <div className="text-[10px] text-gray-600 leading-tight space-y-0.5">
                              <div>{formatColorValue('hsl', hsl)}</div>
                              <div>{formatColorValue('lch', lch)}</div>
                              <div>{formatColorValue('hscl', hscl)}</div>
                            </div>
                          </div>
                        );
                      })}
                      {palette.colors.length > 16 && (
                        <div className="text-center">
                          <div className="aspect-square rounded border border-gray-300 bg-gray-100 flex items-center justify-center text-xs text-gray-600 mb-1">
                            +{palette.colors.length - 16}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Palette info */}
                    <div className="text-xs text-gray-500">
                      {palette.colors.length} colors
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    {onLoadPalette && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadPalette(palette);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Load palette"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => deletePalette(palette.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete palette"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {feedback && (
            <div className="mt-3 text-sm text-gray-700 font-medium">
              {feedback}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Palette detail modal */}
      {showDetailModal && selectedPalette && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPalette(null);
          }}
          title={selectedPalette.name}
          className="sm:max-w-lg max-h-[90vh] no-padding"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-6 py-4">
            {/* Color grid without data display */}
            <div className="grid grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2 flex-shrink-0">
              {selectedPalette.colors.map((color, index) => {
                const hex = rgbToHex(color.color);
                
                return (
                  <div
                    key={index}
                    className="aspect-square rounded border border-gray-200 cursor-pointer"
                    style={{ backgroundColor: hex }}
                    onClick={() => {
                      setSelectedColor(color);
                      setShowColorDetailModal(true);
                    }}
                  />
                );
              })}
            </div>

            {/* Palette metadata */}
            <div className="border-t border-gray-200 pt-4 space-y-2 flex-shrink-0">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Colors:</span>
                <span className="font-medium">{selectedPalette.colors.length}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 flex-shrink-0">
              <Button
                onClick={() => setShowExportModal(true)}
                variant="outline"
              >
                Export
              </Button>
              {onLoadPalette && (
                <Button
                  onClick={() => {
                    loadPalette(selectedPalette);
                    setShowDetailModal(false);
                    setSelectedPalette(null);
                  }}
                  variant="outline"
                >
                  Load Palette
                </Button>
              )}
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPalette(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Color detail modal */}
      {selectedColor && (
        <Modal
          isOpen={showColorDetailModal}
          onClose={() => {
            setShowColorDetailModal(false);
            setSelectedColor(null);
          }}
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

            {/* Color characteristics */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-black mb-2">Color Characteristics</h4>
              {(() => {
                const hsl = rgbToHsl(selectedColor.color);
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Temperature:</span>
                      <span className="font-medium">
                        {getColorTemperature(hsl)}
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
            </div>
          </div>
        </Modal>
      )}

      {/* Export palette modal */}
      {showExportModal && selectedPalette && (
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title={`Export ${selectedPalette.name}`}
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose a format to export &ldquo;{selectedPalette.name}&rdquo; palette:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleExportPalette('png', selectedPalette)}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">PNG Image</div>
                <div className="text-sm text-gray-600">Visual palette grid for sharing</div>
              </button>

              <button
                onClick={() => handleExportPalette('json', selectedPalette)}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">JSON Data</div>
                <div className="text-sm text-gray-600">Complete color data with metadata</div>
              </button>

              <button
                onClick={() => handleExportPalette('ase', selectedPalette)}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">Adobe ASE</div>
                <div className="text-sm text-gray-600">Adobe Swatch Exchange format</div>
              </button>

              <button
                onClick={() => handleExportPalette('css', selectedPalette)}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">CSS Variables</div>
                <div className="text-sm text-gray-600">CSS custom properties</div>
              </button>

              <button
                onClick={() => handleExportPalette('scss', selectedPalette)}
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

      {/* Bulk export modal */}
      {showBulkExportModal && (
        <Modal
          isOpen={showBulkExportModal}
          onClose={() => setShowBulkExportModal(false)}
          title="Export All Palettes"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose a format to export all {savedPalettes.length} palettes:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleBulkExport('json')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">JSON Collection</div>
                <div className="text-sm text-gray-600">Single file with all palettes and metadata</div>
              </button>

              <button
                onClick={() => handleBulkExport('png')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">PNG Images</div>
                <div className="text-sm text-gray-600">Individual PNG files for each palette</div>
              </button>

              <button
                onClick={() => handleBulkExport('ase')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">Adobe ASE Files</div>
                <div className="text-sm text-gray-600">Individual ASE files for each palette</div>
              </button>

              <button
                onClick={() => handleBulkExport('css')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">CSS Files</div>
                <div className="text-sm text-gray-600">Individual CSS files for each palette</div>
              </button>

              <button
                onClick={() => handleBulkExport('scss')}
                disabled={isExporting}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-semibold text-black">SCSS Files</div>
                <div className="text-sm text-gray-600">Individual SCSS files for each palette</div>
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