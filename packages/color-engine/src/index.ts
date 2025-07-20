/**
 * Color Engine for Painting Palette Tool
 * Based on Phase 0 verification results - optimized for quality and performance
 */

export * from './types.js';
export * from './color-space.js';
export * from './sampling.js';
export * from './extraction.js';

import { ImageSampler } from './sampling.js';
import { ColorExtractor } from './extraction.js';
import { ColorSpaceConverter } from './color-space.js';
import {
  ExtractionConfig,
  ExtractionResult,
  RGBColor,
  LABColor,
} from './types.js';

/**
 * Main Color Engine API
 */
export class PaletteExtractor {
  /**
   * Extract color palette from image with optimized settings
   */
  static async extractPalette(
    imageData: ImageData,
    config: Partial<ExtractionConfig> = {}
  ): Promise<ExtractionResult> {
    // Default configuration based on Phase 0 verification
    const defaultConfig: ExtractionConfig = {
      targetColorCount: 8,
      maxColorCount: 16,
      qualityThreshold: 0.8,
      colorDistanceThreshold: 15,
      algorithm: 'hybrid', // Best quality from Phase 0
      samplingStrategy: 'hybrid', // Best overall performance
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Step 1: Sample image pixels using optimized strategy
    const sampleCount = Math.min(
      Math.max(finalConfig.targetColorCount * 100, 1000),
      15000 // Optimal sample count from Phase 0
    );

    let samples;
    switch (finalConfig.samplingStrategy) {
      case 'uniform':
        samples = ImageSampler.uniformSample(imageData, sampleCount);
        break;
      case 'importance':
        samples = ImageSampler.importanceSample(imageData, sampleCount);
        break;
      case 'edge':
        samples = ImageSampler.edgeSample(imageData, sampleCount);
        break;
      case 'hybrid':
      default:
        samples = ImageSampler.hybridSample(imageData, sampleCount);
        break;
    }

    // Step 2: Extract colors using selected algorithm
    const result = await ColorExtractor.extractColors(samples, finalConfig);

    return result;
  }

  /**
   * Analyze extracted colors for painting suitability
   */
  static analyzePaintingColors(colors: RGBColor[]): {
    lightness: { light: RGBColor[]; mid: RGBColor[]; dark: RGBColor[] };
    temperature: { warm: RGBColor[]; neutral: RGBColor[]; cool: RGBColor[] };
    diversity: number;
    coverage: number;
  } {
    const lightness = {
      light: [] as RGBColor[],
      mid: [] as RGBColor[],
      dark: [] as RGBColor[],
    };
    const temperature = {
      warm: [] as RGBColor[],
      neutral: [] as RGBColor[],
      cool: [] as RGBColor[],
    };

    for (const color of colors) {
      // Classify by lightness using perceptual luminance
      const luminance = ColorSpaceConverter.calculateLuminance(color);
      if (luminance > 0.7) {
        lightness.light.push(color);
      } else if (luminance > 0.3) {
        lightness.mid.push(color);
      } else {
        lightness.dark.push(color);
      }

      // Classify by temperature using HSV
      const hsv = ColorSpaceConverter.rgbToHsv(color);
      if ((hsv.h >= 0 && hsv.h <= 60) || (hsv.h >= 300 && hsv.h <= 360)) {
        temperature.warm.push(color);
      } else if (hsv.h >= 180 && hsv.h <= 240) {
        temperature.cool.push(color);
      } else {
        temperature.neutral.push(color);
      }
    }

    // Calculate diversity (average pairwise distance in LAB space)
    let totalDistance = 0;
    let pairCount = 0;
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const lab1 = ColorSpaceConverter.rgbToLab(colors[i]!);
        const lab2 = ColorSpaceConverter.rgbToLab(colors[j]!);
        totalDistance += ColorSpaceConverter.calculateDeltaE(lab1, lab2);
        pairCount++;
      }
    }
    const diversity = pairCount > 0 ? totalDistance / pairCount : 0;

    // Calculate coverage (lightness range)
    const luminances = colors.map((c) =>
      ColorSpaceConverter.calculateLuminance(c)
    );
    const minLum = Math.min(...luminances);
    const maxLum = Math.max(...luminances);
    const coverage = maxLum - minLum;

    return { lightness, temperature, diversity: diversity / 50, coverage };
  }

  /**
   * Convert RGB color to hex string
   */
  static rgbToHex(color: RGBColor): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  /**
   * Convert hex string to RGB color
   */
  static hexToRgb(hex: string): RGBColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : null;
  }
}
