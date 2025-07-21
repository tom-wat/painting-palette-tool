'use client';

import React, { useState, useCallback } from 'react';
import ImageUpload from '@/components/features/ImageUpload';
import ImageCanvas from '@/components/features/ImageCanvas';
import ColorPalette from '@/components/features/ColorPalette';
import BrightnessAnalysis from '@/components/features/BrightnessAnalysis';
import AdvancedSelectionTools, { type SelectionMode, type AdvancedSelectionConfig } from '@/components/features/AdvancedSelectionTools';
import { Card, CardContent, Slider, Select, Toggle } from '@/components/ui';
import { PaletteExtractor } from '@palette-tool/color-engine';
import { analyzePalette, PaletteAnalysis } from '@/lib/brightness-analysis';
import { useProcessingPipeline } from '@/lib/processing-pipeline';

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
  const [selectedImageData, setSelectedImageData] = useState<ImageData | null>(null);
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [brightnessAnalysis, setBrightnessAnalysis] = useState<PaletteAnalysis | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  
  
  // Processing pipeline hook
  const pipeline = useProcessingPipeline();


  // Advanced selection tools state
  const [selectionConfig, setSelectionConfig] = useState<AdvancedSelectionConfig>({
    mode: 'rectangle' as SelectionMode,
  });
  const [clearSelectionFn, setClearSelectionFn] = useState<(() => void) | null>(null);
  
  // Use useCallback to prevent re-rendering issues
  const handleClearSelectionCallback = useCallback((clearFn: () => void) => {
    setClearSelectionFn(() => clearFn);
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
    setBrightnessAnalysis(null);

    // Auto-extract colors with default settings from full image
    await extractColors(imgData, settings);
  };

  const handleSelectionChange = async (selectionData: ImageData | null) => {
    setSelectedImageData(selectionData);
    
    // Extract colors from selection if available, otherwise from full image
    const dataToUse = selectionData || imageData;
    if (dataToUse) {
      await extractColors(dataToUse, settings);
    }
  };

  const extractColors = async (imgData: ImageData, extractionSettings: ExtractionSettings) => {
    // Check cache first
    const cachedResult = pipeline.getCachedResult(imgData, extractionSettings);
    if (cachedResult) {
      setExtractedColors(cachedResult.colors);
      setBrightnessAnalysis(cachedResult.analysis);
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
          const brightnessA = (a.color.r * 0.299 + a.color.g * 0.587 + a.color.b * 0.114);
          const brightnessB = (b.color.r * 0.299 + b.color.g * 0.587 + b.color.b * 0.114);
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
      const analysis = analyzePalette(colors);
      
      setProcessingProgress(100);

      // Update state
      setExtractedColors(colors);
      setBrightnessAnalysis(analysis);
      
      // Cache the result
      pipeline.setCachedResult(imgData, extractionSettings, { colors, analysis });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'Processing cancelled') {
        console.log('Color extraction cancelled');
        return;
      }
      
      console.error('Color extraction failed:', error);
      // Fallback to simple extraction
      const colors = extractSimpleColors(imgData, extractionSettings.colorCount);
      setExtractedColors(colors);
      
      // Perform brightness analysis on fallback colors
      const analysis = analyzePalette(colors);
      setBrightnessAnalysis(analysis);
      
      // Cache fallback result
      pipeline.setCachedResult(imgData, extractionSettings, { colors, analysis });
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

  // Clear cache
  const handleClearCache = () => {
    pipeline.clearCache();
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

  // Algorithm and sorting options
  const algorithmOptions = [
    { value: 'kmeans', label: 'K-Means', description: 'Standard clustering algorithm' },
    { value: 'octree', label: 'Octree', description: 'Fast color quantization' },
    { value: 'mediancut', label: 'Median Cut', description: 'Traditional color reduction' },
    { value: 'hybrid', label: 'Hybrid', description: 'Best quality (recommended)' },
  ];

  const sortOptions = [
    { value: 'frequency', label: 'Frequency', description: 'Most common colors first' },
    { value: 'brightness', label: 'Brightness', description: 'Dark to light' },
    { value: 'hue', label: 'Hue', description: 'Rainbow order' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold">Painting Palette Tool</h1>
        <p className="text-sm text-gray-600">
          Extract optimized color palettes from reference images for painting
        </p>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Advanced Selection Tools */}
            {uploadedImage && (
              <AdvancedSelectionTools
                config={selectionConfig}
                onConfigChange={setSelectionConfig}
                onModeChange={(mode) => setSelectionConfig(prev => ({ ...prev, mode }))}
                onClearSelection={() => clearSelectionFn?.()}
              />
            )}

            {/* Settings */}
            {imageData && (
            <Card>
              <CardContent>
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
                    onChange={(checked) => updateSettings({ includeTransparent: checked })}
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
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cache Controls */}
                  {!isExtracting && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-3 text-sm">
                        <div className="text-gray-600">
                          Cache: {pipeline.getCacheStats().entries} entries ({Math.round(pipeline.getCacheStats().sizeBytes / 1024)}KB)
                        </div>
                        <button
                          onClick={handleClearCache}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full"
                        >
                          Clear Cache
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-6">
            {!uploadedImage && (
              /* Image Upload - Full width when no image */
              <div className="w-full">
                <ImageUpload onImageUpload={handleImageUpload} />
              </div>
            )}
            
            {uploadedImage && (
              <>
                {/* Image Canvas */}
                <ImageCanvas
                  imageFile={uploadedImage}
                  onSelectionChange={handleSelectionChange}
                  selectionMode={selectionConfig.mode}
                  onClearSelection={handleClearSelectionCallback}
                />

                {/* Brightness Analysis */}
                <BrightnessAnalysis analysis={brightnessAnalysis} />

                {/* Image Upload (bottom) */}
                <ImageUpload onImageUpload={handleImageUpload} />
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            {uploadedImage && (
              /* Color Palette */
              <ColorPalette colors={extractedColors} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
