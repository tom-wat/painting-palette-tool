'use client';

import ColorPalette from '@/components/features/ColorPalette';
import ImageCanvas from '@/components/features/ImageCanvas';
import ImageUpload from '@/components/features/ImageUpload';
import AnnotationControls from '@/components/features/AnnotationControls';
import { useCallback, useEffect, useRef, useState } from 'react';
// import BrightnessAnalysis from '@/components/features/BrightnessAnalysis';
import AdvancedSelectionTools, {
  type AdvancedSelectionConfig,
  type SelectionMode,
  type AnnotationMode,
} from '@/components/features/AdvancedSelectionTools';
import SavedPalettesPanel from '@/components/features/SavedPalettesPanel';
import MobileTabBar, { type MobileTab } from '@/components/features/MobileTabBar';
import { Card, CardContent, Select, Slider, Toggle, useToast } from '@/components/ui';
import { PaletteExtractor } from '@palette-tool/color-engine';
// import { analyzePalette, PaletteAnalysis } from '@/lib/brightness-analysis';
import { areColorsSimilar, rgbToGrayscale } from '@/lib/color-space-conversions';
import { useProcessingPipeline } from '@/lib/processing-pipeline';
import {
  type ColorAnnotation,
  exportImageWithAnnotations,
  exportAnnotationsOnly,
  downloadFile,
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
  isAdded?: boolean; // 追加された色かどうかのフラグ
  id?: string; // 色の一意識別子
}

interface ExtractionSettings {
  colorCount: number;
  algorithm: string;
  quality: number;
  includeTransparent: boolean;
  sortBy: string;
}

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<ImageData | null>(
    null
  );
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  // const [brightnessAnalysis, setBrightnessAnalysis] = useState<PaletteAnalysis | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [lastAddedColorIds, setLastAddedColorIds] = useState<Set<string>>(
    new Set()
  );
  const [isGreyscale, setIsGreyscale] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'palette'>('image');

  // Annotation state
  const [annotations, setAnnotations] = useState<ColorAnnotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('pick');
  const [annotationLineOpacity, setAnnotationLineOpacity] = useState(0.7);
  const [annotationFontSize, setAnnotationFontSize] = useState<number>(16);
  const [annotationTheme, setAnnotationTheme] = useState<'light' | 'dark'>('dark');
  const [annotationLineColor, setAnnotationLineColor] = useState<string>('#ffffff');

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas');
  const [paletteBadge, setPaletteBadge] = useState(false);

  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === 'palette') setPaletteBadge(false);
  };

  // Toast notification hook
  const { showToast, ToastContainer } = useToast();

  // Processing pipeline hook
  const pipeline = useProcessingPipeline();

  // Advanced selection tools state
  const [selectionConfig, setSelectionConfig] =
    useState<AdvancedSelectionConfig>({
      mode: 'point' as SelectionMode,
    });
  const clearSelectionFnRef = useRef<(() => void) | null>(null);
  const isInitialSave = useRef(true);

  // Load UI settings from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('painting-palette-ui-settings');
      if (stored) {
        const s = JSON.parse(stored);
        if (s.annotationLineOpacity !== undefined) setAnnotationLineOpacity(s.annotationLineOpacity);
        if (s.annotationFontSize !== undefined) setAnnotationFontSize(s.annotationFontSize);
        if (s.annotationMode) setAnnotationMode(s.annotationMode);
        if (s.annotationTheme) setAnnotationTheme(s.annotationTheme);
        if (s.annotationLineColor) setAnnotationLineColor(s.annotationLineColor);
        if (s.selectionMode) setSelectionConfig((prev) => ({ ...prev, mode: s.selectionMode }));
      }
    } catch {
      // ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save UI settings to localStorage on change (skip first run to avoid overwriting loaded values)
  useEffect(() => {
    if (isInitialSave.current) {
      isInitialSave.current = false;
      return;
    }
    try {
      const settings = {
        annotationLineOpacity,
        annotationFontSize,
        annotationMode,
        annotationTheme,
        annotationLineColor,
        selectionMode: selectionConfig.mode,
      };
      localStorage.setItem('painting-palette-ui-settings', JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [annotationLineOpacity, annotationFontSize, annotationMode, annotationTheme, annotationLineColor, selectionConfig.mode]);

  // Use useCallback to prevent re-rendering issues
  const handleClearSelectionCallback = useCallback((clearFn: () => void) => {
    clearSelectionFnRef.current = clearFn;
  }, []);

  const [settings, setSettings] = useState<ExtractionSettings>({
    colorCount: 8,
    algorithm: 'hybrid',
    quality: 5,
    includeTransparent: false,
    sortBy: 'frequency',
  });

  const handleImageUpload = async (file: File, imgData: ImageData) => {
    setUploadedImage(file);
    setImageData(imgData);
    setSelectedImageData(null);
    setExtractedColors([]);
    setMobileTab('canvas');
    // setBrightnessAnalysis(null);

    // Don't auto-extract colors on upload - let user choose when to extract
  };

  const handleSelectionChange = async (selectionData: ImageData | null) => {
    if (selectionData) {
      // Always add colors from new selection to existing palette
      const newColors = await extractColorsForAddMode(
        selectionData,
        settings,
        isGreyscale
      );
      if (newColors.length > 0) {
        const { mergedColors, newColorIds } = mergeAndDeduplicateColors(
          extractedColors,
          newColors
        );
        setExtractedColors(mergedColors);
        // Update last added color IDs (only keep the new ones)
        setLastAddedColorIds(new Set(newColorIds));
        if (mobileTab !== 'palette') setPaletteBadge(true);
      }
    }
    setSelectedImageData(selectionData);
  };

  // Extract colors for Add Mode (simplified, no caching)
  const extractColorsForAddMode = async (
    imgData: ImageData,
    extractionSettings: ExtractionSettings,
    applyGrayscale: boolean = false
  ): Promise<ExtractedColor[]> => {
    try {
      // Use color-engine for extraction
      const result = await PaletteExtractor.extractPalette(imgData, {
        targetColorCount: Math.min(extractionSettings.colorCount, 8), // Limit for add mode
        algorithm: extractionSettings.algorithm as any,
        qualityThreshold: extractionSettings.quality / 10,
      });

      let colors = result.colors;

      // Apply grayscale conversion if enabled
      if (applyGrayscale) {
        colors = colors.map((colorData) => ({
          ...colorData,
          color: rgbToGrayscale(colorData.color),
        }));
      }

      // Apply sorting
      if (extractionSettings.sortBy === 'brightness') {
        colors = colors.sort((a, b) => {
          const brightnessA =
            a.color.r * 0.299 + a.color.g * 0.587 + a.color.b * 0.114;
          const brightnessB =
            b.color.r * 0.299 + b.color.g * 0.587 + b.color.b * 0.114;
          return brightnessA - brightnessB;
        });
      } else if (extractionSettings.sortBy === 'hue') {
        colors = colors.sort((a, b) => {
          const hueA = rgbToHue(a.color);
          const hueB = rgbToHue(b.color);
          return hueA - hueB;
        });
      }

      return colors;
    } catch (error) {
      console.error('Add mode color extraction failed:', error);
      return extractSimpleColors(
        imgData,
        Math.min(extractionSettings.colorCount, 8)
      );
    }
  };

  const extractColors = async (
    imgData: ImageData,
    extractionSettings: ExtractionSettings
  ) => {
    // Check cache first
    const cachedResult = pipeline.getCachedResult(imgData, extractionSettings);
    if (cachedResult) {
      setExtractedColors(cachedResult.colors);
      // setBrightnessAnalysis(cachedResult.analysis);
      return;
    }

    setIsExtracting(true);
    setProcessingProgress(0);
    setCanCancel(true);

    // Start processing with cancellation support
    const abortController = pipeline.startProcessing();

    try {
      setProcessingProgress(10);

      // Use color-engine for extraction
      const result = await PaletteExtractor.extractPalette(imgData, {
        targetColorCount: extractionSettings.colorCount,
        algorithm: extractionSettings.algorithm as any,
        qualityThreshold: extractionSettings.quality / 10, // Convert 1-10 to 0.1-1.0
      });

      // Check for cancellation
      if (abortController.signal.aborted) {
        throw new Error('Processing cancelled');
      }

      setProcessingProgress(60);

      let colors = result.colors;

      // Apply sorting
      if (extractionSettings.sortBy === 'brightness') {
        colors = colors.sort((a, b) => {
          const brightnessA =
            a.color.r * 0.299 + a.color.g * 0.587 + a.color.b * 0.114;
          const brightnessB =
            b.color.r * 0.299 + b.color.g * 0.587 + b.color.b * 0.114;
          return brightnessA - brightnessB;
        });
      } else if (extractionSettings.sortBy === 'hue') {
        colors = colors.sort((a, b) => {
          const hueA = rgbToHue(a.color);
          const hueB = rgbToHue(b.color);
          return hueA - hueB;
        });
      }
      // Default: frequency (already sorted by color-engine)

      setProcessingProgress(80);

      // Check for cancellation before analysis
      if (abortController.signal.aborted) {
        throw new Error('Processing cancelled');
      }

      // Perform brightness analysis
      // const analysis = analyzePalette(colors);

      setProcessingProgress(100);

      // Update state
      setExtractedColors(colors);
      // setBrightnessAnalysis(analysis);

      // Cache the result
      pipeline.setCachedResult(imgData, extractionSettings, { colors });
    } catch (error) {
      if (error instanceof Error && error.message === 'Processing cancelled') {
        console.log('Color extraction cancelled');
        return;
      }

      console.error('Color extraction failed:', error);
      // Fallback to simple extraction
      const colors = extractSimpleColors(
        imgData,
        extractionSettings.colorCount
      );
      setExtractedColors(colors);

      // Perform brightness analysis on fallback colors
      // const analysis = analyzePalette(colors);
      // setBrightnessAnalysis(analysis);

      // Cache fallback result
      pipeline.setCachedResult(imgData, extractionSettings, { colors });
    } finally {
      setIsExtracting(false);
      setProcessingProgress(0);
      setCanCancel(false);
    }
  };

  // RGB to Hue conversion helper
  const rgbToHue = (rgb: RGBColor): number => {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) return 0;

    let hue = 0;
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }

    return hue * 60;
  };

  // Handle settings changes with debouncing
  const updateSettings = (updates: Partial<ExtractionSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    // Debounced re-extraction to avoid rapid successive calls
    const debouncedExtraction = pipeline.debounce(
      'settings-update',
      (data: ImageData, config: ExtractionSettings) => {
        extractColors(data, config);
      },
      300 // 300ms delay
    );

    const dataToUse = selectedImageData || imageData;
    if (dataToUse) {
      debouncedExtraction(dataToUse, newSettings);
    }
  };

  // Cancel current processing
  const handleCancelProcessing = () => {
    pipeline.cancelProcessing();
  };

  // Simple color extraction for demo purposes
  const extractSimpleColors = (
    imgData: ImageData,
    count: number
  ): ExtractedColor[] => {
    const { data, width, height } = imgData;
    const colorMap = new Map<string, { color: RGBColor; count: number }>();

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = Math.round(data[i]! / 32) * 32;
      const g = Math.round(data[i + 1]! / 32) * 32;
      const b = Math.round(data[i + 2]! / 32) * 32;

      const key = `${r},${g},${b}`;
      const existing = colorMap.get(key);

      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { color: { r, g, b }, count: 1 });
      }
    }

    // Sort by frequency and take top colors
    const sorted = Array.from(colorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, count);

    const totalPixels = width * height;

    return sorted.map((item) => ({
      color: item.color,
      frequency: item.count / totalPixels,
      importance: Math.random() * 0.5 + 0.5, // Mock values
      representativeness: Math.random() * 0.3 + 0.7,
    }));
  };

  // Color merging logic for Add Mode
  const mergeAndDeduplicateColors = (
    existing: ExtractedColor[],
    newColors: ExtractedColor[],
    maxColors: number = 16
  ): { mergedColors: ExtractedColor[]; newColorIds: string[] } => {
    const merged = [...existing];
    const newColorIds: string[] = [];

    newColors.forEach((newColor) => {
      const isDuplicate = existing.some((existingColor) =>
        areColorsSimilar(existingColor.color, newColor.color, 8)
      );

      if (!isDuplicate) {
        const colorId = generateColorId(newColor.color);
        merged.push({
          ...newColor,
          isAdded: true, // Mark as added color
          id: colorId,
        });
        newColorIds.push(colorId);
      }
    });

    return {
      mergedColors: merged.slice(0, maxColors), // Limit total colors
      newColorIds,
    };
  };

  // Algorithm and sorting options
  const algorithmOptions = [
    {
      value: 'kmeans',
      label: 'K-Means',
      description: 'Standard clustering algorithm',
    },
    {
      value: 'octree',
      label: 'Octree',
      description: 'Fast color quantization',
    },
    {
      value: 'mediancut',
      label: 'Median Cut',
      description: 'Traditional color reduction',
    },
    {
      value: 'hybrid',
      label: 'Hybrid',
      description: 'Best quality (recommended)',
    },
  ];

  const sortOptions = [
    {
      value: 'frequency',
      label: 'Frequency',
      description: 'Most common colors first',
    },
    { value: 'brightness', label: 'Brightness', description: 'Dark to light' },
    { value: 'hue', label: 'Hue', description: 'Rainbow order' },
  ];

  const handleDeleteColor = (colorIndex: number) => {
    const updatedColors = extractedColors.filter(
      (_, index) => index !== colorIndex
    );
    setExtractedColors(updatedColors);
  };

  // Generate unique ID for colors
  const generateColorId = (color: {
    r: number;
    g: number;
    b: number;
  }): string => {
    return `${color.r}-${color.g}-${color.b}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // Handle point color addition
  const handlePointColorAdd = (color: { r: number; g: number; b: number }) => {
    // Check if exact same color already exists (only for point selection)
    const isExactDuplicate = extractedColors.some(
      (existingColor) =>
        existingColor.color.r === color.r &&
        existingColor.color.g === color.g &&
        existingColor.color.b === color.b
    );

    if (!isExactDuplicate) {
      // Create ExtractedColor object from pixel color
      const colorId = generateColorId(color);
      const newExtractedColor: ExtractedColor = {
        color,
        frequency: 0.01, // Minimal frequency for single pixel
        importance: 0.8, // High importance as user-selected
        representativeness: 0.9, // High representativeness
        isAdded: true,
        id: colorId,
      };

      const updatedColors = [...extractedColors, newExtractedColor];
      setExtractedColors(updatedColors);

      // Update last added color IDs (only keep the new one)
      setLastAddedColorIds(new Set([colorId]));
      if (mobileTab !== 'palette') setPaletteBadge(true);
    } else {
      showToast('Exact same color already exists in palette', 'error');
    }
  };

  const handleAddColorFromSaved = (color: ExtractedColor) => {
    // Check if color already exists
    const isDuplicate = extractedColors.some((existingColor) =>
      areColorsSimilar(existingColor.color, color.color, 8)
    );

    if (!isDuplicate) {
      const colorId = generateColorId(color.color);
      const newColor = {
        ...color,
        isAdded: true, // Mark as added color
        id: colorId,
      };
      const updatedColors = [...extractedColors, newColor];
      setExtractedColors(updatedColors);

      // Update last added color IDs (only keep the new one)
      setLastAddedColorIds(new Set([colorId]));
      if (mobileTab !== 'palette') setPaletteBadge(true);
    } else {
      showToast('Color already exists in palette', 'error');
    }
  };

  // Reset palette function
  const handleResetPalette = () => {
    setExtractedColors([]);
    setSelectedImageData(null);
    setLastAddedColorIds(new Set());
  };

  // Clear image and return to initial state
  const handleClearImage = () => {
    setUploadedImage(null);
    setImageData(null);
    setSelectedImageData(null);
    setExtractedColors([]);
    setLastAddedColorIds(new Set());
    setAnnotations([]);
    setActiveTab('image');
  };

  // Export PNG = image + annotations at original resolution
  const handleExportImage = async () => {
    if (!uploadedImage || annotations.length === 0) return;
    try {
      const blob = await exportImageWithAnnotations(uploadedImage, annotations, {
        lineOpacity: annotationLineOpacity,
        fontSize: annotationFontSize,
        theme: annotationTheme,
        lineColor: annotationLineColor,
      });
      const date = new Date().toISOString().split('T')[0];
      downloadFile(blob, `image-annotated-${date}.png`);
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed', 'error');
    }
  };

  // Export PNG (overlay) = annotations only on transparent background at original resolution
  const handleExportOverlay = async () => {
    if (!uploadedImage || annotations.length === 0) return;
    try {
      const blob = await exportAnnotationsOnly(uploadedImage, annotations, {
        lineOpacity: annotationLineOpacity,
        fontSize: annotationFontSize,
        theme: annotationTheme,
        lineColor: annotationLineColor,
      });
      const date = new Date().toISOString().split('T')[0];
      downloadFile(blob, `overlay-${date}.png`);
    } catch (error) {
      console.error('Overlay export failed:', error);
      showToast('Export failed', 'error');
    }
  };


  // Shared sub-components referenced in both layouts
  const imageCanvasEl = uploadedImage ? (
    <ImageCanvas
      imageFile={uploadedImage}
      onSelectionChange={handleSelectionChange}
      onPointColorAdd={handlePointColorAdd}
      selectionMode={selectionConfig.mode}
      onClearSelection={handleClearSelectionCallback}
      isGreyscale={isGreyscale}
      className="flex-1 flex flex-col"
      annotations={annotations}
      onAnnotationsChange={setAnnotations}
      annotationMode={annotationMode}
      annotationLineOpacity={annotationLineOpacity}
      annotationFontSize={annotationFontSize}
      annotationTheme={annotationTheme}
      annotationLineColor={annotationLineColor}
    />
  ) : null;

  const rightPanelEl = selectionConfig.mode === 'point' && annotationMode === 'annotate' ? (
    <AnnotationControls
      lineOpacity={annotationLineOpacity}
      onLineOpacityChange={setAnnotationLineOpacity}
      fontSize={annotationFontSize}
      onFontSizeChange={setAnnotationFontSize}
      onClearAnnotations={() => setAnnotations([])}
      onExportImage={handleExportImage}
      onExportOverlay={handleExportOverlay}
      hasAnnotations={annotations.length > 0}
      annotationTheme={annotationTheme}
      onAnnotationThemeChange={setAnnotationTheme}
      lineColor={annotationLineColor}
      onLineColorChange={setAnnotationLineColor}
    />
  ) : (
    <ColorPalette
      colors={extractedColors}
      imageFilename={uploadedImage?.name}
      lastAddedColorIds={lastAddedColorIds}
      onDeleteColor={handleDeleteColor}
      onResetPalette={handleResetPalette}
    />
  );

  const leftPanelEl = (
    <div className="p-4 space-y-4">
      {uploadedImage ? (
        <AdvancedSelectionTools
          config={selectionConfig}
          onConfigChange={setSelectionConfig}
          onModeChange={(mode) =>
            setSelectionConfig((prev) => ({ ...prev, mode }))
          }
          onClearSelection={() => clearSelectionFnRef.current?.()}
          annotationMode={annotationMode}
          onAnnotationModeChange={setAnnotationMode}
        />
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-6 text-gray-500">
              <div className="mb-2">Selection Tools</div>
              <div className="text-sm">
                Upload an image to access selection tools
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          {imageData ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Extraction Settings</h3>
              <div className="grid grid-cols-1 gap-4">
                <Slider
                  label="Number of Colors"
                  value={settings.colorCount}
                  onChange={(value) => updateSettings({ colorCount: value })}
                  min={3}
                  max={16}
                  step={1}
                />
                <Select
                  label="Algorithm"
                  value={settings.algorithm}
                  onChange={(value) => updateSettings({ algorithm: value })}
                  options={algorithmOptions}
                />
                <Select
                  label="Sort By"
                  value={settings.sortBy}
                  onChange={(value) => updateSettings({ sortBy: value })}
                  options={sortOptions}
                />
                <Slider
                  label="Quality"
                  value={settings.quality}
                  onChange={(value) => updateSettings({ quality: value })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              <Toggle
                label="Include Transparent Colors"
                checked={settings.includeTransparent}
                onChange={(checked) =>
                  updateSettings({ includeTransparent: checked })
                }
              />
              {isExtracting && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>Extracting colors...</span>
                    </div>
                    {canCancel && (
                      <button
                        onClick={handleCancelProcessing}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {processingProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-800 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Extraction Settings</h3>
              <div className="text-center py-6 text-gray-500">
                <div className="mb-2">Configure extraction parameters</div>
                <div className="text-sm">
                  Upload an image to access settings
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {/* ── Desktop layout (≥1024px) ── */}
      <main className="hidden lg:flex h-screen flex-col bg-gray-50 text-gray-800">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <h1
              className={`text-lg font-bold transition-colors select-none ${uploadedImage ? 'cursor-pointer hover:text-gray-500' : ''}`}
              onClick={uploadedImage ? handleClearImage : undefined}
              title={uploadedImage ? 'Click to clear image and return to top' : undefined}
            >
              Painting Palette
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setActiveTab(activeTab === 'image' ? 'palette' : 'image')
                }
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {activeTab === 'image' ? 'Palette' : 'Image'}
              </button>
              <button
                onClick={() => setIsGreyscale(!isGreyscale)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isGreyscale ? 'Color' : 'Greyscale'}
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-80 bg-white border-r border-gray-100 overflow-y-auto">
            {leftPanelEl}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'image' ? (
              <>
                {uploadedImage ? (
                  <div className="flex-1 p-4 flex flex-col overflow-hidden">
                    {imageCanvasEl}
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      hasUploadedImage={!!uploadedImage}
                      showToast={showToast}
                    />
                  </div>
                ) : (
                  <div className="flex-1 p-4">
                    <ImageUpload
                      onImageUpload={handleImageUpload}
                      hasUploadedImage={!!uploadedImage}
                      showToast={showToast}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 space-y-6 overflow-auto">
                <SavedPalettesPanel onAddColorToExtracted={handleAddColorFromSaved} />
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-white border-l border-gray-100">
            <div className="p-4 h-full">{rightPanelEl}</div>
          </div>
        </div>
      </main>

      {/* ── Mobile layout (<1024px) ── */}
      <main className="lg:hidden flex h-screen flex-col bg-gray-50 text-gray-800">
        {/* Compact Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <h1
            className={`text-base font-bold transition-colors select-none ${uploadedImage ? 'cursor-pointer hover:text-gray-500' : ''}`}
            onClick={uploadedImage ? handleClearImage : undefined}
          >
            Painting Palette
          </h1>
          <button
            onClick={() => setIsGreyscale(!isGreyscale)}
            className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {isGreyscale ? 'Color' : 'Greyscale'}
          </button>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Canvas Tab */}
          {mobileTab === 'canvas' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Quick mode selector (only when image loaded) */}
              {uploadedImage && (
                <div className="bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2">
                  {([
                    { mode: 'point', label: 'Point' },
                    { mode: 'rectangle', label: 'Rect' },
                    { mode: 'polygon', label: 'Poly' },
                  ] as const).map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => setSelectionConfig((prev) => ({ ...prev, mode }))}
                      className={`px-3 py-1 text-xs rounded-md border transition-colors flex-shrink-0 ${
                        selectionConfig.mode === mode
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {selectionConfig.mode === 'point' && (
                    <div className="ml-auto flex-shrink-0 flex rounded-md border border-gray-200 overflow-hidden">
                      {(['pick', 'annotate'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setAnnotationMode(mode)}
                          className={`px-3 py-1 text-xs font-medium transition-colors capitalize ${
                            annotationMode === mode
                              ? 'bg-gray-800 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {uploadedImage ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {imageCanvasEl}
                  <ImageUpload
                    onImageUpload={handleImageUpload}
                    hasUploadedImage={!!uploadedImage}
                    showToast={showToast}
                  />
                </div>
              ) : (
                <div className="flex-1 p-4">
                  <ImageUpload
                    onImageUpload={handleImageUpload}
                    hasUploadedImage={!!uploadedImage}
                    showToast={showToast}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tools Tab */}
          {mobileTab === 'tools' && (
            <div className="flex-1 overflow-y-auto">
              {leftPanelEl}
            </div>
          )}

          {/* Palette Tab */}
          {mobileTab === 'palette' && (
            <div className="flex-1 overflow-hidden">
              <div className="p-4 h-full">{rightPanelEl}</div>
            </div>
          )}

          {/* Saved Tab */}
          {mobileTab === 'saved' && (
            <div className="flex-1 overflow-y-auto p-4">
              <SavedPalettesPanel onAddColorToExtracted={handleAddColorFromSaved} />
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <MobileTabBar
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
          paletteTabLabel={selectionConfig.mode === 'point' && annotationMode === 'annotate' ? 'Annotate' : 'Palette'}
          showPaletteBadge={paletteBadge}
        />
      </main>

      {/* Toast Container */}
      {ToastContainer}
    </>
  );
}
