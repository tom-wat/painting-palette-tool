import React, { useState, useRef } from 'react';
import {
  type RGBColor,
  type ExtractedColor,
  rgbToHsl,
  rgbToLab,
  rgbToLch,
  rgbToOklch,
  calculateHScL,
  formatColorValue,
} from '@palette-tool/color-engine';
import { DownloadSimple, FolderOpen, Trash } from '@phosphor-icons/react';
import { Button, Input, Modal } from '../ui';
import { ToggleChip } from '../controls';
import { cn } from '@/lib/cn';
import type { SavedPalette } from '@/lib/export-formats';
import { useSavedPalettesStore } from '@/hooks/useSavedPalettesStore';
import { usePaletteExportActions } from '@/hooks/usePaletteExportActions';

interface SavedPalettesPanelProps {
  className?: string;
  onLoadPalette?: (_palette: SavedPalette) => void;
  onAddColorToExtracted?: (_color: ExtractedColor) => void;
  /** How export failures reach the user. */
  onError?: (_message: string) => void;
}

/**
 * Panel chrome shared with the side panels: a bordered title row and a
 * scrolling body, with the outer border left to whatever contains it.
 */
function PanelShell({
  title,
  actions,
  filters,
  className,
  children,
}: {
  title: string;
  actions: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
        {filters}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

export default function SavedPalettesPanel({
  className = '',
  onLoadPalette,
  onAddColorToExtracted,
  onError,
}: SavedPalettesPanelProps) {
  const [selectedPalette, setSelectedPalette] = useState<SavedPalette | null>(null);
  const [showColorDetailModal, setShowColorDetailModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState<ExtractedColor | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paletteToDelete, setPaletteToDelete] = useState<SavedPalette | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTagFilter, setActiveTagFilter] = useState<string>('');
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  const [showPaletteDetailModal, setShowPaletteDetailModal] = useState(false);
  const [editingPalette, setEditingPalette] = useState<SavedPalette | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingTagInput, setEditingTagInput] = useState<string>('');
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [showColorSpaceLabels, setShowColorSpaceLabels] = useState<Record<string, boolean>>({});
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    savedPalettes,
    availableTags,
    deletePaletteById,
    updatePaletteById,
    importOnePalette,
    importManyPalettes,
  } = useSavedPalettesStore();

  const {
    isExporting,
    exportIndividualPaletteAsPNG,
    exportAllPalettesAsPNG,
    handleExportPalette: handleExportPaletteAction,
    handleBulkExport: handleBulkExportAction,
  } = usePaletteExportActions(onError);

  // Helper function to convert RGB to HEX
  const rgbToHex = (color: RGBColor): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };

  // Helper function to get swatch border class based on color brightness
  const getSwatchBorderClass = (color: RGBColor): string => {
    const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    if (brightness > 220) return 'border border-input';
    if (brightness < 30) return 'border border-input';
    return 'border border-border';
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
            <span className="text-muted-foreground tracking-wide">{label}</span>
            <span className="text-foreground font-mono">{value}{suffix}</span>
          </div>
        )}
        <div className="h-1 bg-border rounded-full overflow-hidden">
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
          <div className="text-[12px] text-muted-foreground font-medium mb-1">HSL</div>
        )}
        <div className="space-y-1">
          <BarGraph label="H" value={hsl.h} max={360} suffix="°" colorSpace="hsl" type="H" />
          <BarGraph label="S" value={hsl.s} max={100} suffix="%" colorSpace="hsl" type="S" />
          <BarGraph label="L" value={hsl.l} max={100} suffix="%" colorSpace="hsl" type="L" />
        </div>
        
        {/* HScL Values */}
        {showLabels && (
          <div className="text-[12px] text-muted-foreground font-medium mb-1 mt-3">HScL</div>
        )}
        <div className={`space-y-1 ${!showLabels ? 'mt-3' : ''}`}>
          <BarGraph label="H" value={hscl.h} max={360} suffix="°" colorSpace="hscl" type="H" />
          <BarGraph label="Sc" value={hscl.sc} max={100} suffix="%" colorSpace="hscl" type="Sc" />
          <BarGraph label="L" value={hscl.l} max={100} suffix="%" colorSpace="hscl" type="L" />
        </div>
      </div>
    );
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
  const copyToClipboard = async (text: string, _format: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Export single palette (closes the export modal, and the detail modal if
  // it happened to be open, only on success — matches the original inline
  // behavior of handleExportPalette).
  const handleExportPalette = (format: string, palette: SavedPalette) =>
    handleExportPaletteAction(format, palette, () => {
      setShowExportModal(false);
      if (showPaletteDetailModal) {
        setShowPaletteDetailModal(false);
      }
    });

  // Export all palettes
  const handleBulkExport = (format: string) =>
    handleBulkExportAction(format, savedPalettes, () => setShowBulkExportModal(false));

  // Import JSON palette
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const importData = JSON.parse(jsonContent);

        // Validate and convert imported data
        let importedPalette: SavedPalette;

        if (importData.palette && importData.colors) {
          // Single palette format (from exportSavedPaletteAsJSON)
          importedPalette = {
            id: `palette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: importData.palette.name || 'Imported Palette',
            colors: importData.colors.map((colorData: any) => ({
              color: {
                r: colorData.rgb.r,
                g: colorData.rgb.g,
                b: colorData.rgb.b,
              },
              frequency: 0.1, // Default values for missing properties
              importance: 0.8,
              representativeness: 0.9,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: importData.palette.tags || [],
          };
        } else if (importData.colors && Array.isArray(importData.colors)) {
          // Simple colors format (from exportAsJSON)
          importedPalette = {
            id: `palette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Imported Palette',
            colors: importData.colors.map((colorData: any) => ({
              color: {
                r: colorData.rgb.r,
                g: colorData.rgb.g,
                b: colorData.rgb.b,
              },
              frequency: 0.1,
              importance: 0.8,
              representativeness: 0.9,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [],
          };
        } else if (importData.palettes && Array.isArray(importData.palettes)) {
          // Multiple palettes format (from bulk export) - import all palettes
          if (importData.palettes.length === 0) {
            throw new Error('No palettes found in the imported file');
          }
          
          // Process all palettes
          const importedPalettes: SavedPalette[] = importData.palettes.map((paletteData: any) => ({
            id: `palette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: paletteData.palette.name || 'Imported Palette',
            colors: paletteData.colors.map((colorData: any) => ({
              color: {
                r: colorData.rgb.r,
                g: colorData.rgb.g,
                b: colorData.rgb.b,
              },
              frequency: 0.1,
              importance: 0.8,
              representativeness: 0.9,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: paletteData.palette.tags || [],
          }));

          // Save all palettes to storage
          importManyPalettes(importedPalettes);

          setShowImportModal(false);
          return; // Exit early since we handled everything here
        } else {
          throw new Error('Invalid JSON format. Expected palette data with colors.');
        }

        // Save to storage
        importOnePalette(importedPalette);

        setShowImportModal(false);

      } catch (error) {
        console.error('JSON import failed:', error);
      }
    };

    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter palettes based on selected tag
  // Filter palettes by search query (name and tags) and active tag filter
  const filteredPalettes = savedPalettes.filter(palette => {
    // Parse search query into individual keywords (split by space, filter out empty strings)
    const searchKeywords = searchQuery.trim().toLowerCase().split(/\s+/).filter(keyword => keyword.length > 0);
    
    // First apply search query filter (searches both name and tags)
    const matchesSearch = searchKeywords.length === 0 || searchKeywords.every(keyword => {
      // Check if keyword exists in palette name
      const nameMatch = palette.name.toLowerCase().includes(keyword);
      
      // Check if keyword exists in any tag
      const tagMatch = palette.tags && palette.tags.some(tag => 
        tag.toLowerCase().includes(keyword)
      );
      
      // Keyword must match either name or tags
      return nameMatch || tagMatch;
    });
    
    // Then apply active tag filter
    const matchesTagFilter = activeTagFilter === '' || 
      (palette.tags && palette.tags.includes(activeTagFilter));
    
    return matchesSearch && matchesTagFilter;
  });

  // Limit displayed tags (first 10 by default)
  const TAG_DISPLAY_LIMIT = 10;
  const displayedTags = showAllTags 
    ? availableTags 
    : availableTags.slice(0, TAG_DISPLAY_LIMIT);

  const hasMoreTags = availableTags.length > TAG_DISPLAY_LIMIT;

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
      deletePaletteById(paletteToDelete.id);
    } catch (error) {
      console.error('Failed to delete palette:', error);
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
    if (e.key === 'Enter' && !isComposing) {
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
      updatePaletteById(editingPalette.id, {
        name: editingName.trim(),
        tags: editingTags.length > 0 ? editingTags : undefined,
        updatedAt: new Date().toISOString(),
      });

      setShowPaletteDetailModal(false);
    } catch (error) {
      console.error('Failed to update palette:', error);
    }
  };

  // Delete color from saved palette
  const handleDeleteColorFromPalette = (paletteId: string, colorToDelete: ExtractedColor) => {
    try {
      const palette = savedPalettes.find(p => p.id === paletteId);
      if (!palette) return;

      const updatedColors = palette.colors.filter(color =>
        !(color.color.r === colorToDelete.color.r &&
          color.color.g === colorToDelete.color.g &&
          color.color.b === colorToDelete.color.b)
      );

      updatePaletteById(paletteId, {
        colors: updatedColors,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to delete color:', error);
    }
  };

  if (savedPalettes.length === 0) {
    return (
      <>
        <PanelShell
          title="Saved Palettes (0)"
          className={className}
          actions={
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              Import JSON
            </Button>
          }
        >
          <div className="py-8 text-center text-sm text-muted-foreground">
            <div className="mb-2">No saved palettes yet</div>
            <div className="text-xs">Save palettes or import JSON files to see them here</div>
          </div>
        </PanelShell>

        {/* JSON Import modal */}
        {showImportModal && (
          <Modal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            title="Import JSON Palette"
            className="sm:max-w-md"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a JSON file exported from this tool to import a palette:
              </p>
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports JSON files exported from individual palettes or color extractions
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>Supported formats:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Individual palette JSON (from palette export)</li>
                  <li>Color extraction JSON (from color palette export)</li>
                  <li>Bulk export JSON (imports first palette)</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </>
    );
  }

  const paletteCount =
    searchQuery || activeTagFilter ? filteredPalettes.length : savedPalettes.length;

  return (
    <>
      <PanelShell
        title={`Saved Palettes (${paletteCount})`}
        className={className}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              Import JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleAllLabels}
              disabled={savedPalettes.length === 0}
            >
              {showAllLabels ? 'Hide All Data' : 'Show All Data'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportAllPalettesAsPNG(savedPalettes)}
              disabled={savedPalettes.length === 0 || isExporting}
            >
              <DownloadSimple />
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
          </>
        }
        filters={
          availableTags.length > 0 ? (
            <div className="space-y-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search palettes by name or tag (use spaces for multiple keywords)..."
                aria-label="Search palettes"
              />
              <div className="flex flex-wrap gap-1.5">
                <ToggleChip
                  label={`All (${savedPalettes.length})`}
                  pressed={!activeTagFilter}
                  onPressedChange={() => setActiveTagFilter('')}
                />
                {displayedTags.map((tag) => {
                  const count = savedPalettes.filter((palette) =>
                    palette.tags?.includes(tag)
                  ).length;
                  return (
                    <ToggleChip
                      key={tag}
                      label={`${tag} (${count})`}
                      pressed={activeTagFilter === tag}
                      onPressedChange={() => setActiveTagFilter(tag)}
                    />
                  );
                })}
              </div>
              {hasMoreTags && (
                <button
                  onClick={() => setShowAllTags(!showAllTags)}
                  className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
                >
                  {showAllTags
                    ? 'Show less'
                    : `Show more (${availableTags.length - TAG_DISPLAY_LIMIT} more)`}
                </button>
              )}
            </div>
          ) : undefined
        }
      >
          {filteredPalettes.length === 0 && (searchQuery || activeTagFilter) ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="mb-2">
                {searchQuery && activeTagFilter 
                  ? `No palettes found matching "${searchQuery}" with tag "${activeTagFilter}"`
                  : searchQuery
                  ? `No palettes found matching "${searchQuery}"`
                  : `No palettes found with tag "${activeTagFilter}"`
                }
              </div>
              <div className="text-sm">Try adjusting your search or clear the filters</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPalettes.map((palette) => (
              <div
                key={palette.id}
                data-palette-id={palette.id}
                className="cursor-pointer rounded-md p-3 transition-colors hover:bg-accent"
                onClick={() => openPaletteDetailModal(palette)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {palette.name}
                      </h4>
                      <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          title={showColorSpaceLabels[palette.id] ? 'Hide data' : 'Show data'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowColorSpaceLabels((prev) => ({
                              ...prev,
                              [palette.id]: !prev[palette.id],
                            }));
                          }}
                        >
                          {showColorSpaceLabels[palette.id] ? 'Hide Data' : 'Show Data'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Export as PNG"
                          disabled={isExporting}
                          onClick={(e) => {
                            e.stopPropagation();
                            exportIndividualPaletteAsPNG(palette);
                          }}
                        >
                          <DownloadSimple />
                          PNG
                        </Button>
                        {onLoadPalette && (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Load palette"
                            title="Load palette"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadPalette(palette);
                            }}
                          >
                            <FolderOpen />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          aria-label="Delete palette"
                          title="Delete palette"
                          onClick={(e) => showDeleteConfirmation(palette.id, e)}
                        >
                          <Trash />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Tags display */}
                    {palette.tags && palette.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {palette.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="inline-block px-2 py-0.5 text-xs bg-muted text-foreground rounded-md"
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
                              className={`aspect-square rounded shadow-sm mb-1 ${getSwatchBorderClass(color.color)}`}
                              style={{ backgroundColor: hex }}
                            />
                            <ColorValueBars color={color} paletteId={palette.id} />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Palette info - removed color count */}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
      </PanelShell>

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
              <label htmlFor="edit-palette-name" className="block text-sm font-medium text-foreground mb-2">
                Palette Name
              </label>
              <input
                id="edit-palette-name"
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Enter palette name..."
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="edit-palette-tags" className="block text-sm font-medium text-foreground mb-2">
                Tags
              </label>
              <input
                id="edit-palette-tags"
                type="text"
                value={editingTagInput}
                onChange={(e) => setEditingTagInput(e.target.value)}
                onKeyDown={handleEditingTagInputKeyPress}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Enter tags separated by comma or press Enter..."
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter or comma to add tags
              </p>
              
              {editingTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs bg-muted text-foreground rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeEditingTag(tag)}
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

            {/* Color Grid */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Colors ({editingPalette.colors.length})
              </label>
              <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-4 bg-muted rounded-lg">
                {editingPalette.colors.map((color, idx) => {
                  const hsl = rgbToHsl(color.color);
                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded shadow-sm ${getSwatchBorderClass(color.color)}`}
                      style={{ backgroundColor: rgbToHex(color.color) }}
                      title={formatColorValue('hsl', hsl)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Export Section */}
            <div className="pt-4">
              <label className="block text-sm font-medium text-foreground mb-3">
                Export Palette
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExportPalette('json', editingPalette)}
                >
                  JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExportPalette('css', editingPalette)}
                >
                  CSS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExportPalette('ase', editingPalette)}
                >
                  ASE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExportPalette('adobe', editingPalette)}
                >
                  Adobe Color
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExportPalette('procreate', editingPalette)}
                >
                  Procreate
                </Button>
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
                    value={formatColorValue('hsl', rgbToHsl(selectedColor.color))}
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
                    value={formatColorValue('lab', rgbToLab(selectedColor.color))}
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
                    value={formatColorValue('lch', rgbToLch(selectedColor.color))}
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
                    value={formatColorValue('oklch', rgbToOklch(selectedColor.color))}
                    readOnly
                    className="flex-1 px-3 py-2 border border-input rounded-l-md bg-muted text-foreground"
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
            <div className="space-y-3 pt-4">
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
                  className="w-full px-3 py-2 text-sm border border-border rounded-md text-foreground hover:bg-accent transition-colors"
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
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
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
            <p className="text-sm text-muted-foreground">
              Choose a format to export &ldquo;{selectedPalette.name}&rdquo; palette:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleExportPalette('png', selectedPalette)}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">PNG Image</div>
                <div className="text-sm text-muted-foreground">Visual palette grid for sharing</div>
              </button>

              <button
                onClick={() => handleExportPalette('json', selectedPalette)}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">JSON Data</div>
                <div className="text-sm text-muted-foreground">Complete color data with metadata</div>
              </button>

              <button
                onClick={() => handleExportPalette('css', selectedPalette)}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">CSS Variables</div>
                <div className="text-sm text-muted-foreground">CSS custom properties</div>
              </button>

              <button
                onClick={() => handleExportPalette('ase', selectedPalette)}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">Adobe ASE</div>
                <div className="text-sm text-muted-foreground">Adobe Swatch Exchange format</div>
              </button>

              <button
                onClick={() => handleExportPalette('adobe', selectedPalette)}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">Adobe Color</div>
                <div className="text-sm text-muted-foreground">ACO palette file for Adobe products</div>
              </button>

              <button
                onClick={() => handleExportPalette('procreate', selectedPalette)}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">Procreate</div>
                <div className="text-sm text-muted-foreground">Swatches file for Procreate</div>
              </button>

            </div>

            {isExporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Preparing export...</span>
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
            <p className="text-sm text-muted-foreground">
              Choose a format to export all {savedPalettes.length} palettes:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleBulkExport('json')}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">JSON Collection</div>
                <div className="text-sm text-muted-foreground">Single file with all palettes and metadata</div>
              </button>

              <button
                onClick={() => handleBulkExport('css')}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">CSS File</div>
                <div className="text-sm text-muted-foreground">Single CSS file with all palette variables</div>
              </button>

              <button
                onClick={() => handleBulkExport('ase')}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">Adobe ASE File</div>
                <div className="text-sm text-muted-foreground">Single ASE file with all palette colors</div>
              </button>

              <button
                onClick={() => handleBulkExport('adobe')}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">Adobe Color File</div>
                <div className="text-sm text-muted-foreground">Single ACO file with all palette colors</div>
              </button>

              <button
                onClick={() => handleBulkExport('procreate')}
                disabled={isExporting}
                className="rounded-md border border-border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">Procreate File</div>
                <div className="text-sm text-muted-foreground">Single swatches file with all palette colors</div>
              </button>

            </div>

            {isExporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Preparing export...</span>
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
            <div className="text-sm text-muted-foreground">
              Are you sure you want to delete the palette <strong>&ldquo;{paletteToDelete.name}&rdquo;</strong>?
            </div>
            <div className="text-sm text-muted-foreground">
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
                className="bg-destructive hover:bg-destructive/90 text-primary-foreground"
              >
                Delete Palette
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* JSON Import modal */}
      {showImportModal && (
        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Import JSON Palette"
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a JSON file exported from this tool to import a palette:
            </p>
            
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports JSON files exported from individual palettes or color extractions
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              <strong>Supported formats:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Individual palette JSON (from palette export)</li>
                <li>Color extraction JSON (from color palette export)</li>
                <li>Bulk export JSON (imports first palette)</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
}