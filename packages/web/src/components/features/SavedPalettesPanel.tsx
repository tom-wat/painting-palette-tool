import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Modal } from '../ui';
import { 
  exportAsPNG, 
  exportSavedPaletteAsJSON,
  exportAsASE, 
  exportAsCSS, 
  downloadFile, 
  downloadTextFile 
} from '@/lib/export-formats';
import html2canvas from 'html2canvas';
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

interface SavedPalettesPanelProps {
  className?: string;
  onLoadPalette?: (_palette: SavedPalette) => void;
  onAddColorToExtracted?: (_color: ExtractedColor) => void;
}

export default function SavedPalettesPanel({
  className = '',
  onLoadPalette,
  onAddColorToExtracted,
}: SavedPalettesPanelProps) {
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<SavedPalette | null>(null);
  const [showColorDetailModal, setShowColorDetailModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paletteToDelete, setPaletteToDelete] = useState<SavedPalette | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  const [showPaletteDetailModal, setShowPaletteDetailModal] = useState(false);
  const [editingPalette, setEditingPalette] = useState<SavedPalette | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingTagInput, setEditingTagInput] = useState<string>('');
  const [showColorSpaceLabels, setShowColorSpaceLabels] = useState<Record<string, boolean>>({});
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  const paletteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper function to convert RGB to HEX
  const rgbToHex = (color: RGBColor): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };

  // Helper function to get bar color based on color space and type
  const getBarColor = (colorSpace: 'hsl' | 'hscl', type: 'H' | 'S' | 'L' | 'Sc', value: number, color: RGBColor) => {
    const hsl = rgbToHsl(color);
    const hscl = calculateHScL(color);
    
    switch(colorSpace) {
      case 'hsl':
        switch(type) {
          case 'H': return `hsl(${value}, 50%, 50%)`;
          case 'S': return `hsl(${hsl.h}, ${value}%, 60%)`;
          case 'L': return `hsl(${hsl.h}, 50%, 60%)`;
          default: return '#9ca3af'; // gray-400
        }
      
      case 'hscl':
        switch(type) {
          case 'H': return `hsl(${value}, 50%, 50%)`;
          case 'Sc': return `hsl(${hscl.h}, ${value}%, 60%)`;
          case 'L': return `hsl(${hscl.h}, 50%, 60%)`;
          default: return '#9ca3af'; // gray-400
        }
      
      default:
        return '#9ca3af'; // gray-400
    }
  };

  // Component for rendering horizontal bar graphs
  const ColorValueBars = ({ color, paletteId }: { color: ExtractedColor; paletteId: string }) => {
    const hsl = rgbToHsl(color.color);
    const hscl = calculateHScL(color.color);
    const showLabels = showColorSpaceLabels[paletteId] || false;
    
    const BarGraph = ({ 
      label, 
      value, 
      max, 
      suffix = '', 
      colorSpace, 
      type 
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
            <span className="text-gray-700 font-mono">{value}{suffix}</span>
          </div>
        )}
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-200"
            style={{ 
              width: `${Math.min((value / max) * 100, 100)}%`,
              backgroundColor: getBarColor(colorSpace, type, value, color.color)
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
          <BarGraph label="H" value={hsl.h} max={360} suffix="°" colorSpace="hsl" type="H" />
          <BarGraph label="S" value={hsl.s} max={100} suffix="%" colorSpace="hsl" type="S" />
          <BarGraph label="L" value={hsl.l} max={100} suffix="%" colorSpace="hsl" type="L" />
        </div>
        
        {/* HScL Values */}
        {showLabels && (
          <div className="text-[12px] text-gray-500 font-medium mb-1 mt-3">HScL</div>
        )}
        <div className={`space-y-1 ${!showLabels ? 'mt-3' : ''}`}>
          <BarGraph label="H" value={hscl.h} max={360} suffix="°" colorSpace="hscl" type="H" />
          <BarGraph label="Sc" value={hscl.sc} max={100} suffix="%" colorSpace="hscl" type="Sc" />
          <BarGraph label="L" value={hscl.l} max={100} suffix="%" colorSpace="hscl" type="L" />
        </div>
      </div>
    );
  };






  // Export individual palette as PNG
  const exportIndividualPaletteAsPNG = async (palette: SavedPalette) => {
    const paletteElement = paletteRefs.current[palette.id];
    if (!paletteElement) return;
    
    setIsExporting(true);
    try {
      // Scroll to top to fix text positioning issues
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);
      
      // Small delay to ensure scroll is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(paletteElement, {
        backgroundColor: '#ffffff',
        scale: window.devicePixelRatio || 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
      });
      
      // Restore original scroll position
      window.scrollTo(0, originalScrollY);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `${palette.name}-palette-${timestamp}.png`;
          downloadFile(blob, filename);
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('PNG export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export all palettes as single PNG
  const exportAllPalettesAsPNG = async () => {
    const palettesContainer = document.querySelector('[data-palettes-container]') as HTMLElement;
    if (!palettesContainer) return;
    
    setIsExporting(true);
    try {
      // Scroll to top to fix text positioning issues
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);
      
      // Small delay to ensure scroll is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(palettesContainer, {
        backgroundColor: '#ffffff',
        scale: window.devicePixelRatio || 1,
        useCORS: true,
        allowTaint: true,
        logging: false,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
      });
      
      // Restore original scroll position
      window.scrollTo(0, originalScrollY);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `all-palettes-${timestamp}.png`;
          downloadFile(blob, filename);
        }
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('PNG export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle all labels
  const handleToggleAllLabels = () => {
    const newShowAll = !showAllLabels;
    setShowAllLabels(newShowAll);
    
    // Set all palettes to the same state
    const newLabelsState: Record<string, boolean> = {};
    filteredPalettes.forEach(palette => {
      newLabelsState[palette.id] = newShowAll;
    });
    setShowColorSpaceLabels(newLabelsState);
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
          // Check if called from modal and use modal element
          const modalKey = `modal-${palette.id}`;
          const modalElement = paletteRefs.current[modalKey];
          
          if (modalElement) {
            // Use html2canvas for modal export
            const canvas = await html2canvas(modalElement, {
              backgroundColor: '#ffffff',
              scale: 2,
              useCORS: true,
              allowTaint: true,
            });
            
            canvas.toBlob((blob) => {
              if (blob) {
                downloadFile(blob, `${baseFilename}.png`);
              }
            }, 'image/png', 0.95);
          } else {
            // Fallback to original PNG export
            const pngBlob = await exportAsPNG(palette.colors);
            downloadFile(pngBlob, `${baseFilename}.png`);
          }
          break;
        }
        
        case 'json': {
          const jsonContent = exportSavedPaletteAsJSON(palette);
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
        
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      setFeedback(`Exported ${palette.name} as ${format.toUpperCase()}`);
      setTimeout(() => setFeedback(null), 3000);
      setShowExportModal(false);
      if (showPaletteDetailModal) {
        setShowPaletteDetailModal(false);
      }
      
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
          palettes: savedPalettes.map(palette => ({
            palette: {
              name: palette.name,
              tags: palette.tags || [],
            },
            colors: palette.colors.map((extractedColor, index) => ({
              index: index + 1,
              rgb: {
                r: extractedColor.color.r,
                g: extractedColor.color.g,
                b: extractedColor.color.b,
              },
            }))
          }))
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
          const sortedPalettes = palettes.sort((a: SavedPalette, b: SavedPalette) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setSavedPalettes(sortedPalettes);
          
          // Extract unique tags
          const allTags = new Set<string>();
          sortedPalettes.forEach((palette: SavedPalette) => {
            if (palette.tags) {
              palette.tags.forEach(tag => allTags.add(tag));
            }
          });
          setAvailableTags(Array.from(allTags).sort());
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

  // Filter palettes based on selected tag
  const filteredPalettes = tagFilter 
    ? savedPalettes.filter(palette => 
        palette.tags && palette.tags.includes(tagFilter)
      )
    : savedPalettes;

  // Filter tags based on search query
  const filteredAvailableTags = availableTags.filter(tag =>
    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  // Limit displayed tags (first 10 by default)
  const TAG_DISPLAY_LIMIT = 10;
  const displayedTags = showAllTags 
    ? filteredAvailableTags 
    : filteredAvailableTags.slice(0, TAG_DISPLAY_LIMIT);

  const hasMoreTags = filteredAvailableTags.length > TAG_DISPLAY_LIMIT;

  // Show delete confirmation modal
  const showDeleteConfirmation = (paletteId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening detail modal
    const palette = savedPalettes.find(p => p.id === paletteId);
    if (palette) {
      setPaletteToDelete(palette);
      setShowDeleteModal(true);
    }
  };

  // Actually delete palette
  const confirmDeletePalette = () => {
    if (!paletteToDelete) return;
    
    try {
      const updatedPalettes = savedPalettes.filter(p => p.id !== paletteToDelete.id);
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
    } finally {
      setShowDeleteModal(false);
      setPaletteToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPaletteToDelete(null);
  };

  // Load palette (if callback provided)
  const loadPalette = (palette: SavedPalette) => {
    if (onLoadPalette) {
      onLoadPalette(palette);
      setFeedback(`Loaded palette: ${palette.name}`);
      setTimeout(() => setFeedback(null), 2000);
    }
  };


  // Open palette detail modal
  const openPaletteDetailModal = (palette: SavedPalette) => {
    setEditingPalette(palette);
    setEditingName(palette.name);
    setEditingTags(palette.tags || []);
    setEditingTagInput('');
    setShowPaletteDetailModal(true);
  };

  // Tag editing functions for detail modal
  const addEditingTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !editingTags.includes(trimmedTag)) {
      setEditingTags([...editingTags, trimmedTag]);
    }
    setEditingTagInput('');
  };

  const removeEditingTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter(tag => tag !== tagToRemove));
  };

  const handleEditingTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEditingTag(editingTagInput);
    } else if (e.key === ',' && editingTagInput.trim()) {
      e.preventDefault();
      addEditingTag(editingTagInput);
    }
  };

  // Save palette changes
  const savePaletteChanges = () => {
    if (!editingPalette || !editingName.trim()) return;

    try {
      const updatedPalette: SavedPalette = {
        ...editingPalette,
        name: editingName.trim(),
        tags: editingTags.length > 0 ? editingTags : undefined,
        updatedAt: new Date().toISOString(),
      };

      const updatedPalettes = savedPalettes.map(palette =>
        palette.id === editingPalette.id ? updatedPalette : palette
      );

      setSavedPalettes(updatedPalettes);
      localStorage.setItem('saved-palettes', JSON.stringify(updatedPalettes));

      // Update available tags
      const allTags = new Set<string>();
      updatedPalettes.forEach((palette: SavedPalette) => {
        if (palette.tags) {
          palette.tags.forEach(tag => allTags.add(tag));
        }
      });
      setAvailableTags(Array.from(allTags).sort());

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('palettes-updated'));

      setFeedback(`Palette "${editingName.trim()}" updated successfully!`);
      setTimeout(() => setFeedback(null), 3000);
      setShowPaletteDetailModal(false);
    } catch (error) {
      setFeedback('Failed to update palette');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Delete color from saved palette
  const handleDeleteColorFromPalette = (paletteId: string, colorToDelete: ExtractedColor) => {
    try {
      const updatedPalettes = savedPalettes.map(palette => {
        if (palette.id === paletteId) {
          const updatedColors = palette.colors.filter(color => 
            !(color.color.r === colorToDelete.color.r &&
              color.color.g === colorToDelete.color.g &&
              color.color.b === colorToDelete.color.b)
          );
          return { ...palette, colors: updatedColors, updatedAt: new Date().toISOString() };
        }
        return palette;
      });
      
      setSavedPalettes(updatedPalettes);
      localStorage.setItem('saved-palettes', JSON.stringify(updatedPalettes));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('palettes-updated'));
      
      setFeedback('Color deleted from palette');
      setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      console.error('Failed to delete color:', error);
      setFeedback('Failed to delete color');
      setTimeout(() => setFeedback(null), 2000);
    }
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
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Saved Palettes ({tagFilter ? filteredPalettes.length : savedPalettes.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAllLabels}
                disabled={savedPalettes.length === 0}
              >
                {showAllLabels ? 'Hide All' : 'Show All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAllPalettesAsPNG()}
                disabled={savedPalettes.length === 0 || isExporting}
              >
                PNG All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkExportModal(true)}
                disabled={savedPalettes.length === 0}
              >
                Export All
              </Button>
            </div>
          </div>
          
          {/* Tag filter */}
          {availableTags.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-black">
                Filter by tag:
              </label>
              
              {/* Tag search input */}
              <div>
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Tag buttons */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTagFilter('')}
                    className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                      !tagFilter 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All ({savedPalettes.length})
                  </button>
                  {displayedTags.map(tag => {
                    const count = savedPalettes.filter(p => p.tags?.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        onClick={() => setTagFilter(tag)}
                        className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                          tagFilter === tag 
                            ? 'bg-black text-white border-black' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {tag} ({count})
                      </button>
                    );
                  })}
                </div>
                
                {/* Show more/less button */}
                {hasMoreTags && !tagSearchQuery && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {showAllTags ? 'Show less' : `Show more (${filteredAvailableTags.length - TAG_DISPLAY_LIMIT} more)`}
                  </button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredPalettes.length === 0 && tagFilter ? (
            <div className="text-center py-6 text-gray-500">
              <div className="mb-2">No palettes found with tag &ldquo;{tagFilter}&rdquo;</div>
              <div className="text-sm">Try selecting a different tag or clear the filter</div>
            </div>
          ) : (
            <div className="space-y-3" data-palettes-container>
              {filteredPalettes.map((palette) => (
              <div
                key={palette.id}
                ref={(el) => {
                  if (el) {
                    paletteRefs.current[palette.id] = el;
                  }
                }}
                className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer"
                style={{ transform: 'translateZ(0)' }}
                onClick={() => openPaletteDetailModal(palette)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-black text-sm truncate">
                        {palette.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowColorSpaceLabels(prev => ({
                            ...prev,
                            [palette.id]: !prev[palette.id]
                          }));
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors ml-2 flex-shrink-0"
                        title={showColorSpaceLabels[palette.id] ? 'Hide labels' : 'Show labels'}
                      >
                        {showColorSpaceLabels[palette.id] ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    {/* Tags display */}
                    {palette.tags && palette.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {palette.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Color preview grid with data below squares */}
                    <div className="grid grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-1 mb-3">
                      {palette.colors.map((color, idx) => {
                        const hex = rgbToHex(color.color);
                        
                        return (
                          <div
                            key={idx}
                            className="cursor-pointer text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedColor(color);
                              setSelectedPalette(palette); // Set selected palette for delete functionality
                              setShowColorDetailModal(true);
                            }}
                          >
                            <div
                              className="aspect-square rounded border border-gray-200 shadow-sm mb-1"
                              style={{ backgroundColor: hex }}
                            />
                            <ColorValueBars color={color} paletteId={palette.id} />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Palette info - removed color count */}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportIndividualPaletteAsPNG(palette);
                      }}
                      className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                      title="Export as PNG"
                      disabled={isExporting}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
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
                      onClick={(e) => showDeleteConfirmation(palette.id, e)}
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
          )}
          
          {feedback && (
            <div className="mt-3 text-sm text-gray-700 font-medium">
              {feedback}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Palette Detail Modal */}
      {showPaletteDetailModal && editingPalette && (
        <Modal
          isOpen={showPaletteDetailModal}
          onClose={() => {
            setShowPaletteDetailModal(false);
            setEditingPalette(null);
            setEditingName('');
            setEditingTags([]);
            setEditingTagInput('');
          }}
          title="Edit Palette"
          className="sm:max-w-2xl"
        >
          <div className="space-y-6">
            {/* Palette Name */}
            <div>
              <label htmlFor="edit-palette-name" className="block text-sm font-medium text-black mb-2">
                Palette Name
              </label>
              <input
                id="edit-palette-name"
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Enter palette name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="edit-palette-tags" className="block text-sm font-medium text-black mb-2">
                Tags
              </label>
              <input
                id="edit-palette-tags"
                type="text"
                value={editingTagInput}
                onChange={(e) => setEditingTagInput(e.target.value)}
                onKeyDown={handleEditingTagInputKeyPress}
                placeholder="Enter tags separated by comma or press Enter..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
              <p className="text-xs text-gray-500 mt-1">
                Press Enter or comma to add tags
              </p>
              
              {editingTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeEditingTag(tag)}
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

            {/* Color Grid */}
            <div 
              ref={(el) => {
                if (el && editingPalette) {
                  paletteRefs.current[`modal-${editingPalette.id}`] = el;
                }
              }}
            >
              <label className="block text-sm font-medium text-black mb-2">
                Colors ({editingPalette.colors.length})
              </label>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-4 bg-gray-50 rounded-lg">
                {editingPalette.colors.map((color, idx) => {
                  const hsl = rgbToHsl(color.color);
                  return (
                    <div
                      key={idx}
                      className="aspect-square rounded border border-gray-200 shadow-sm"
                      style={{ backgroundColor: rgbToHex(color.color) }}
                      title={formatColorValue('hsl', hsl)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Export Section */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-black mb-3">
                Export Palette
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <button
                  onClick={() => handleExportPalette('json', editingPalette)}
                  disabled={isExporting}
                  className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleExportPalette('ase', editingPalette)}
                  disabled={isExporting}
                  className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ASE
                </button>
                <button
                  onClick={() => handleExportPalette('css', editingPalette)}
                  disabled={isExporting}
                  className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  CSS
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaletteDetailModal(false);
                  setEditingPalette(null);
                  setEditingName('');
                  setEditingTags([]);
                  setEditingTagInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={savePaletteChanges}
                disabled={!editingName.trim()}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
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
            setSelectedPalette(null);
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

            {/* Add to extracted palette and delete actions */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {onAddColorToExtracted && (
                <button
                  onClick={() => {
                    if (selectedColor) {
                      onAddColorToExtracted(selectedColor);
                      setShowColorDetailModal(false);
                      setSelectedColor(null);
                      setSelectedPalette(null);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Add to Extracted Palette
                </button>
              )}
              <button
                onClick={() => {
                  if (selectedPalette && selectedColor) {
                    handleDeleteColorFromPalette(selectedPalette.id, selectedColor);
                    setShowColorDetailModal(false);
                    setSelectedColor(null);
                    setSelectedPalette(null);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-orange-300 rounded-md text-orange-600 hover:bg-orange-50 transition-colors"
              >
                Delete This Color
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Export palette modal */}
      {showExportModal && selectedPalette && (
        <Modal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setSelectedPalette(null);
          }}
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

      {/* Delete confirmation modal */}
      {showDeleteModal && paletteToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          title="Delete Palette"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Are you sure you want to delete the palette <strong>&ldquo;{paletteToDelete.name}&rdquo;</strong>?
            </div>
            <div className="text-sm text-gray-500">
              This action cannot be undone. The palette contains {paletteToDelete.colors.length} colors.
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={cancelDelete}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeletePalette}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Palette
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
}