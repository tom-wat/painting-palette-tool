import { useState } from 'react';
import {
  PaletteExtractor,
  areColorsSimilar,
  rgbToGrayscale,
  type RGBColor,
  type ExtractedColor,
} from '@palette-tool/color-engine';
import { useProcessingPipeline } from '@/lib/processing-pipeline';
import type { MobileTab } from '@/components/features/MobileTabBar';
import type { ToastType } from '@/components/ui';

export interface ExtractionSettings {
  colorCount: number;
  algorithm: string;
  quality: number;
  includeTransparent: boolean;
  sortBy: string;
}

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

// RGB to Hue conversion helper
function rgbToHue(rgb: RGBColor): number {
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
}

// Generate unique ID for colors
function generateColorId(color: { r: number; g: number; b: number }): string {
  return `${color.r}-${color.g}-${color.b}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Simple color extraction for demo purposes
function extractSimpleColors(imgData: ImageData, count: number): ExtractedColor[] {
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
}

// Color merging logic for Add Mode
function mergeAndDeduplicateColors(
  existing: ExtractedColor[],
  newColors: ExtractedColor[],
  maxColors: number = 16
): { mergedColors: ExtractedColor[]; newColorIds: string[] } {
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
}

/**
 * Owns color-palette extraction: settings, the extraction pipeline
 * (caching/debounce/cancellation), point/selection/saved-color add flows,
 * and the resulting extractedColors list. imageData/isGreyscale/mobileTab
 * are inputs owned by the caller; showToast/setPaletteBadge are effects the
 * caller wants notified of.
 */
export function usePaletteExtraction(
  imageData: ImageData | null,
  isGreyscale: boolean,
  mobileTab: MobileTab,
  setPaletteBadge: (_badge: boolean) => void,
  showToast: (_message: string, _type: ToastType) => void
) {
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [selectedImageData, setSelectedImageData] = useState<ImageData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [lastAddedColorIds, setLastAddedColorIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<ExtractionSettings>({
    colorCount: 8,
    algorithm: 'hybrid',
    quality: 5,
    includeTransparent: false,
    sortBy: 'frequency',
  });

  const pipeline = useProcessingPipeline();

  const sortColors = (colors: ExtractedColor[], sortBy: string): ExtractedColor[] => {
    if (sortBy === 'brightness') {
      return colors.sort((a, b) => {
        const brightnessA = a.color.r * 0.299 + a.color.g * 0.587 + a.color.b * 0.114;
        const brightnessB = b.color.r * 0.299 + b.color.g * 0.587 + b.color.b * 0.114;
        return brightnessA - brightnessB;
      });
    }
    if (sortBy === 'hue') {
      return colors.sort((a, b) => rgbToHue(a.color) - rgbToHue(b.color));
    }
    // Default: frequency (already sorted by color-engine)
    return colors;
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

      return sortColors(colors, extractionSettings.sortBy);
    } catch (error) {
      console.error('Add mode color extraction failed:', error);
      return extractSimpleColors(imgData, Math.min(extractionSettings.colorCount, 8));
    }
  };

  const extractColors = async (imgData: ImageData, extractionSettings: ExtractionSettings) => {
    // Check cache first
    const cachedResult = pipeline.getCachedResult(imgData, extractionSettings);
    if (cachedResult) {
      setExtractedColors(cachedResult.colors);
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

      const colors = sortColors(result.colors, extractionSettings.sortBy);

      setProcessingProgress(80);

      // Check for cancellation before analysis
      if (abortController.signal.aborted) {
        throw new Error('Processing cancelled');
      }

      setProcessingProgress(100);

      // Update state
      setExtractedColors(colors);

      // Cache the result
      pipeline.setCachedResult(imgData, extractionSettings, { colors });
    } catch (error) {
      if (error instanceof Error && error.message === 'Processing cancelled') {
        console.log('Color extraction cancelled');
        return;
      }

      console.error('Color extraction failed:', error);
      // Fallback to simple extraction
      const colors = extractSimpleColors(imgData, extractionSettings.colorCount);
      setExtractedColors(colors);

      // Cache fallback result
      pipeline.setCachedResult(imgData, extractionSettings, { colors });
    } finally {
      setIsExtracting(false);
      setProcessingProgress(0);
      setCanCancel(false);
    }
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

  const handleSelectionChange = async (selectionData: ImageData | null) => {
    if (selectionData) {
      // Always add colors from new selection to existing palette
      const newColors = await extractColorsForAddMode(selectionData, settings, isGreyscale);
      if (newColors.length > 0) {
        const { mergedColors, newColorIds } = mergeAndDeduplicateColors(
          extractedColors,
          newColors
        );
        setExtractedColors(mergedColors);
        // Update last added color IDs (only keep the new ones)
        setLastAddedColorIds(new Set(newColorIds));
        if (newColorIds.length > 0 && mobileTab !== 'palette') setPaletteBadge(true);
      }
    }
    setSelectedImageData(selectionData);
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

  const handleDeleteColor = (colorIndex: number) => {
    const updatedColors = extractedColors.filter((_, index) => index !== colorIndex);
    setExtractedColors(updatedColors);
  };

  // Reset palette function
  const handleResetPalette = () => {
    setExtractedColors([]);
    setSelectedImageData(null);
    setLastAddedColorIds(new Set());
  };

  // Matches handleImageUpload's original reset scope exactly (does not clear
  // lastAddedColorIds, unlike handleResetPalette/handleClearImage below).
  const resetForNewImage = () => {
    setSelectedImageData(null);
    setExtractedColors([]);
  };

  // Matches handleClearImage's original reset scope exactly.
  const resetForClearedImage = () => {
    setSelectedImageData(null);
    setExtractedColors([]);
    setLastAddedColorIds(new Set());
  };

  return {
    extractedColors,
    settings,
    updateSettings,
    isExtracting,
    processingProgress,
    canCancel,
    lastAddedColorIds,
    algorithmOptions,
    sortOptions,
    handleCancelProcessing,
    handleSelectionChange,
    handlePointColorAdd,
    handleAddColorFromSaved,
    handleDeleteColor,
    handleResetPalette,
    resetForNewImage,
    resetForClearedImage,
  };
}
