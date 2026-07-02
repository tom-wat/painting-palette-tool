import { describe, it, expect } from 'vitest';
import { ColorExtractor } from './extraction';
import { ColorSpaceConverter } from './color-space';
import type { SampledPixel, ExtractionConfig, RGBColor } from './types';

function makeSamples(colors: RGBColor[]): SampledPixel[] {
  return colors.map((color, i) => ({ x: i, y: 0, color }));
}

function baseConfig(
  overrides: Partial<ExtractionConfig> = {}
): ExtractionConfig {
  return {
    targetColorCount: 2,
    maxColorCount: 4,
    qualityThreshold: 0.8,
    colorDistanceThreshold: 15,
    algorithm: 'hybrid',
    samplingStrategy: 'hybrid',
    ...overrides,
  };
}

// two well-separated clusters: 10 near-red, 10 near-blue
const twoClusterColors: RGBColor[] = [
  ...Array.from({ length: 10 }, (_, i) => ({ r: 250 + (i % 3), g: 0, b: 0 })),
  ...Array.from({ length: 10 }, (_, i) => ({ r: 0, g: 0, b: 250 + (i % 3) })),
];

describe('ColorExtractor.extractColors', () => {
  it.each(['octree', 'mediancut', 'kmeans', 'hybrid'] as const)(
    'extracts up to targetColorCount colors using %s',
    async (algorithm) => {
      const samples = makeSamples(twoClusterColors);
      const config = baseConfig({ algorithm, targetColorCount: 2 });
      const result = await ColorExtractor.extractColors(samples, config);

      expect(result.algorithm).toBe(algorithm);
      expect(result.colors.length).toBeGreaterThan(0);
      expect(result.colors.length).toBeLessThanOrEqual(config.targetColorCount);
      expect(result.colorCount).toBe(result.colors.length);
    }
  );

  it('finds a red-ish and a blue-ish color for a two-cluster input (mediancut, deterministic)', async () => {
    const samples = makeSamples(twoClusterColors);
    const config = baseConfig({ algorithm: 'mediancut', targetColorCount: 2 });
    const result = await ColorExtractor.extractColors(samples, config);

    const hasRedish = result.colors.some(
      (c) => c.color.r > 200 && c.color.b < 50
    );
    const hasBlueish = result.colors.some(
      (c) => c.color.b > 200 && c.color.r < 50
    );
    expect(hasRedish).toBe(true);
    expect(hasBlueish).toBe(true);
  });

  it('returns an empty result for an empty sample set', async () => {
    const config = baseConfig({ algorithm: 'kmeans', targetColorCount: 3 });
    const result = await ColorExtractor.extractColors([], config);
    expect(result.colors).toHaveLength(0);
    expect(result.colorCount).toBe(0);
  });

  it('computes a quality score between 0 and 1', async () => {
    const samples = makeSamples(twoClusterColors);
    const config = baseConfig({ algorithm: 'hybrid', targetColorCount: 2 });
    const result = await ColorExtractor.extractColors(samples, config);
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(1);
  });

  it('produces colors whose LAB distance reflects the input cluster separation', async () => {
    const samples = makeSamples(twoClusterColors);
    const config = baseConfig({ algorithm: 'mediancut', targetColorCount: 2 });
    const result = await ColorExtractor.extractColors(samples, config);

    expect(result.colors).toHaveLength(2);
    const [c1, c2] = result.colors;
    const lab1 = ColorSpaceConverter.rgbToLab(c1!.color);
    const lab2 = ColorSpaceConverter.rgbToLab(c2!.color);
    expect(ColorSpaceConverter.calculateDeltaE(lab1, lab2)).toBeGreaterThan(
      30
    );
  });
});
