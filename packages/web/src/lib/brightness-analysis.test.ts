import { describe, it, expect } from 'vitest';
import {
  calculateRelativeLuminance,
  calculateBrightness,
  categorizeBrightness,
  calculateContrastRatio,
  getWCAGLevel,
  analyzeBrightnessDistribution,
  calculateBrightnessStatistics,
  analyzeHarmony,
  analyzePalette,
  type RGBColor,
  type ExtractedColor,
} from './brightness-analysis';

const black: RGBColor = { r: 0, g: 0, b: 0 };
const white: RGBColor = { r: 255, g: 255, b: 255 };
const red: RGBColor = { r: 255, g: 0, b: 0 };

function makeColor(color: RGBColor): ExtractedColor {
  return { color, frequency: 1, importance: 1, representativeness: 1 };
}

describe('calculateRelativeLuminance', () => {
  it('returns 0 for black and 1 for white', () => {
    expect(calculateRelativeLuminance(black)).toBeCloseTo(0, 5);
    expect(calculateRelativeLuminance(white)).toBeCloseTo(1, 5);
  });
});

describe('calculateBrightness', () => {
  it('luminance method matches calculateRelativeLuminance', () => {
    expect(calculateBrightness(red, 'luminance')).toBe(
      calculateRelativeLuminance(red)
    );
  });

  it('average method averages the three channels', () => {
    expect(calculateBrightness(red, 'average')).toBeCloseTo(255 / (3 * 255), 5);
  });

  it('max method returns the largest channel', () => {
    expect(calculateBrightness(red, 'max')).toBe(1);
  });

  it('defaults to luminance', () => {
    expect(calculateBrightness(red)).toBe(calculateBrightness(red, 'luminance'));
  });
});

describe('categorizeBrightness', () => {
  it.each([
    [0.05, 'very-dark'],
    [0.2, 'dark'],
    [0.35, 'medium-dark'],
    [0.5, 'medium'],
    [0.7, 'medium-light'],
    [0.85, 'light'],
    [0.95, 'very-light'],
  ] as const)('categorizes %f as %s', (brightness, expected) => {
    expect(categorizeBrightness(brightness)).toBe(expected);
  });
});

describe('calculateContrastRatio', () => {
  it('returns 21 for black vs white', () => {
    expect(calculateContrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it('returns 1 for identical colors', () => {
    expect(calculateContrastRatio(red, red)).toBeCloseTo(1, 5);
  });
});

describe('getWCAGLevel', () => {
  it('classifies contrast ratios', () => {
    expect(getWCAGLevel(8)).toBe('AAA');
    expect(getWCAGLevel(5)).toBe('AA');
    expect(getWCAGLevel(2)).toBe('fail');
  });
});

describe('analyzeBrightnessDistribution', () => {
  it('buckets black and white into dark and light', () => {
    const distribution = analyzeBrightnessDistribution([
      makeColor(black),
      makeColor(white),
    ]);
    expect(distribution.dark).toBe(0.5);
    expect(distribution.light).toBe(0.5);
    expect(distribution.medium).toBe(0);
    expect(distribution.histogram).toHaveLength(10);
  });
});

describe('calculateBrightnessStatistics', () => {
  it('computes mean/median/stddev/range for black and white', () => {
    const stats = calculateBrightnessStatistics([makeColor(black), makeColor(white)]);
    expect(stats.mean).toBeCloseTo(0.5, 5);
    expect(stats.range).toBeCloseTo(1, 5);
    expect(['dark', 'medium', 'light']).toContain(stats.dominantTone);
  });
});

describe('analyzeHarmony', () => {
  it('treats a single color as monochromatic', () => {
    const harmony = analyzeHarmony([makeColor(red)]);
    expect(harmony.isMonochromatic).toBe(true);
    expect(harmony.harmonyScore).toBe(1);
  });

  it('detects complementary colors (red vs cyan)', () => {
    const cyan: RGBColor = { r: 0, g: 255, b: 255 };
    const harmony = analyzeHarmony([makeColor(red), makeColor(cyan)]);
    expect(harmony.isComplementary).toBe(true);
  });
});

describe('analyzePalette', () => {
  it('returns colors annotated with brightness info plus distribution/statistics/harmony', () => {
    const result = analyzePalette([makeColor(black), makeColor(white)]);
    expect(result.colors).toHaveLength(2);
    expect(result.colors[0]).toHaveProperty('brightness');
    expect(result.colors[0]).toHaveProperty('category');
    expect(result.colors[0]).toHaveProperty('contrast');
    expect(result.colors[0]).toHaveProperty('wcagLevel');
    expect(result.distribution.dark).toBe(0.5);
    expect(result.statistics.mean).toBeCloseTo(0.5, 5);
    expect(result.harmony).toBeDefined();
  });
});
