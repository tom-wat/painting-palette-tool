'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import ImageUpload from '@/components/features/ImageUpload';
import ColorPalette from '@/components/features/ColorPalette';
import { Card, CardContent, Slider } from '@/components/ui';
import { PaletteExtractor } from '@palette-tool/color-engine';

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

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [extractedColors, setExtractedColors] = useState<ExtractedColor[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [colorCount, setColorCount] = useState(8);

  const handleImageUpload = async (file: File, imgData: ImageData) => {
    setUploadedImage(file);
    setImageData(imgData);
    setExtractedColors([]);

    // Auto-extract colors with default settings
    await extractColors(imgData, colorCount);
  };

  const extractColors = async (imgData: ImageData, targetColors: number) => {
    setIsExtracting(true);

    try {
      // Use color-engine for extraction
      const result = await PaletteExtractor.extractPalette(imgData, {
        targetColorCount: targetColors,
        algorithm: 'hybrid',
      });

      setExtractedColors(result.colors);
    } catch (error) {
      console.error('Color extraction failed:', error);
      // Fallback to simple extraction
      const colors = extractSimpleColors(imgData, targetColors);
      setExtractedColors(colors);
    } finally {
      setIsExtracting(false);
    }
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

  const handleColorCountChange = (newCount: number) => {
    setColorCount(newCount);
    if (imageData) {
      extractColors(imageData, newCount);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Painting Palette Tool</h1>
          <p className="text-gray-600">
            Extract optimized color palettes from reference images for painting
          </p>
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Image Upload */}
          <ImageUpload onImageUpload={handleImageUpload} />

          {/* Settings */}
          {imageData && (
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Extraction Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Slider
                      label="Number of Colors"
                      value={colorCount}
                      onChange={handleColorCountChange}
                      min={3}
                      max={16}
                      step={1}
                    />
                  </div>

                  {isExtracting && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <span>Extracting colors...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            {uploadedImage && (
              <Card>
                <CardContent>
                  <h3 className="text-lg font-semibold mb-4">
                    Reference Image
                  </h3>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                    <Image
                      src={URL.createObjectURL(uploadedImage)}
                      alt="Reference"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {uploadedImage.name} •{' '}
                    {Math.round(uploadedImage.size / 1024)} KB
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Color Palette */}
            <ColorPalette colors={extractedColors} />
          </div>
        </div>
      </div>
    </main>
  );
}
