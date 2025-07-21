/**
 * Brightness analysis utilities for color palette analysis
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ExtractedColor {
  color: RGBColor;
  frequency: number;
  importance: number;
  representativeness: number;
}

export interface BrightnessAnalysis {
  brightness: number;
  category: BrightnessCategory;
  contrast: number;
  wcagLevel: 'AA' | 'AAA' | 'fail';
}

export interface PaletteAnalysis {
  colors: Array<ExtractedColor & BrightnessAnalysis>;
  distribution: BrightnessDistribution;
  statistics: BrightnessStatistics;
  harmony: HarmonyAnalysis;
}

export interface BrightnessDistribution {
  dark: number;    // 0-0.2
  medium: number;  // 0.2-0.7
  light: number;   // 0.7-1.0
  histogram: number[]; // 10 bins
}

export interface BrightnessStatistics {
  mean: number;
  median: number;
  standardDeviation: number;
  range: number;
  dominantTone: 'dark' | 'medium' | 'light';
}

export interface HarmonyAnalysis {
  isMonochromatic: boolean;
  isComplementary: boolean;
  isAnalogous: boolean;
  contrastRatio: number;
  harmonyScore: number; // 0-1
}

export type BrightnessCategory = 'very-dark' | 'dark' | 'medium-dark' | 'medium' | 'medium-light' | 'light' | 'very-light';

/**
 * Calculate relative luminance according to WCAG 2.1
 * @param color RGB color object
 * @returns Relative luminance value (0-1)
 */
export function calculateRelativeLuminance(color: RGBColor): number {
  // Convert RGB to linear RGB
  const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate perceived brightness using different methods
 * @param color RGB color object
 * @param method Brightness calculation method
 * @returns Brightness value (0-1)
 */
export function calculateBrightness(color: RGBColor, method: 'luminance' | 'average' | 'max' = 'luminance'): number {
  switch (method) {
    case 'luminance':
      return calculateRelativeLuminance(color);
    case 'average':
      return (color.r + color.g + color.b) / (3 * 255);
    case 'max':
      return Math.max(color.r, color.g, color.b) / 255;
    default:
      return calculateRelativeLuminance(color);
  }
}

/**
 * Categorize brightness level
 * @param brightness Brightness value (0-1)
 * @returns Brightness category
 */
export function categorizeBrightness(brightness: number): BrightnessCategory {
  if (brightness < 0.1) return 'very-dark';
  if (brightness < 0.25) return 'dark';
  if (brightness < 0.4) return 'medium-dark';
  if (brightness < 0.6) return 'medium';
  if (brightness < 0.75) return 'medium-light';
  if (brightness < 0.9) return 'light';
  return 'very-light';
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 First color
 * @param color2 Second color
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: RGBColor, color2: RGBColor): number {
  const l1 = calculateRelativeLuminance(color1);
  const l2 = calculateRelativeLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get WCAG compliance level for contrast ratio
 * @param contrastRatio Contrast ratio value
 * @returns WCAG compliance level
 */
export function getWCAGLevel(contrastRatio: number): 'AA' | 'AAA' | 'fail' {
  if (contrastRatio >= 7) return 'AAA';
  if (contrastRatio >= 4.5) return 'AA';
  return 'fail';
}

/**
 * Analyze brightness distribution of color palette
 * @param colors Array of extracted colors
 * @returns Brightness distribution analysis
 */
export function analyzeBrightnessDistribution(colors: ExtractedColor[]): BrightnessDistribution {
  const brightnesses = colors.map(c => calculateBrightness(c.color));
  
  // Count distribution categories
  const dark = brightnesses.filter(b => b < 0.2).length / colors.length;
  const medium = brightnesses.filter(b => b >= 0.2 && b < 0.7).length / colors.length;
  const light = brightnesses.filter(b => b >= 0.7).length / colors.length;
  
  // Create histogram with 10 bins
  const histogram = new Array(10).fill(0);
  brightnesses.forEach(brightness => {
    const bin = Math.min(Math.floor(brightness * 10), 9);
    histogram[bin]++;
  });
  
  return {
    dark,
    medium,
    light,
    histogram: histogram.map(count => count / colors.length),
  };
}

/**
 * Calculate brightness statistics for color palette
 * @param colors Array of extracted colors
 * @returns Brightness statistics
 */
export function calculateBrightnessStatistics(colors: ExtractedColor[]): BrightnessStatistics {
  const brightnesses = colors.map(c => calculateBrightness(c.color));
  
  // Calculate basic statistics
  const mean = brightnesses.reduce((sum, b) => sum + b, 0) / brightnesses.length;
  const sortedBrightnesses = [...brightnesses].sort((a, b) => a - b);
  const median = sortedBrightnesses[Math.floor(sortedBrightnesses.length / 2)];
  
  const variance = brightnesses.reduce((sum, b) => sum + Math.pow(b - mean, 2), 0) / brightnesses.length;
  const standardDeviation = Math.sqrt(variance);
  
  const range = Math.max(...brightnesses) - Math.min(...brightnesses);
  
  // Determine dominant tone
  const distribution = analyzeBrightnessDistribution(colors);
  let dominantTone: 'dark' | 'medium' | 'light' = 'medium';
  if (distribution.dark > distribution.medium && distribution.dark > distribution.light) {
    dominantTone = 'dark';
  } else if (distribution.light > distribution.medium && distribution.light > distribution.dark) {
    dominantTone = 'light';
  }
  
  return {
    mean,
    median,
    standardDeviation,
    range,
    dominantTone,
  };
}

/**
 * Analyze color harmony of palette
 * @param colors Array of extracted colors
 * @returns Harmony analysis
 */
export function analyzeHarmony(colors: ExtractedColor[]): HarmonyAnalysis {
  if (colors.length < 2) {
    return {
      isMonochromatic: true,
      isComplementary: false,
      isAnalogous: false,
      contrastRatio: 1,
      harmonyScore: 1,
    };
  }
  
  // Convert to HSV for harmony analysis
  const hsvColors = colors.map(c => rgbToHsv(c.color));
  
  // Calculate hue differences
  const hueDifferences = [];
  for (let i = 0; i < hsvColors.length - 1; i++) {
    for (let j = i + 1; j < hsvColors.length; j++) {
      const diff = Math.abs(hsvColors[i].h - hsvColors[j].h);
      hueDifferences.push(Math.min(diff, 360 - diff));
    }
  }
  
  // Analyze harmony types
  const avgHueDiff = hueDifferences.reduce((sum, diff) => sum + diff, 0) / hueDifferences.length;
  const isMonochromatic = avgHueDiff < 30;
  const isComplementary = hueDifferences.some(diff => Math.abs(diff - 180) < 30);
  const isAnalogous = avgHueDiff < 60 && !isMonochromatic;
  
  // Calculate overall contrast ratio
  const brightnesses = colors.map(c => calculateBrightness(c.color));
  const maxBrightness = Math.max(...brightnesses);
  const minBrightness = Math.min(...brightnesses);
  const contrastRatio = (maxBrightness + 0.05) / (minBrightness + 0.05);
  
  // Calculate harmony score (simplified)
  let harmonyScore = 0.5;
  if (isMonochromatic) harmonyScore += 0.2;
  if (isComplementary) harmonyScore += 0.2;
  if (isAnalogous) harmonyScore += 0.15;
  if (contrastRatio > 3) harmonyScore += 0.15;
  
  return {
    isMonochromatic,
    isComplementary,
    isAnalogous,
    contrastRatio,
    harmonyScore: Math.min(harmonyScore, 1),
  };
}

/**
 * Convert RGB to HSV
 * @param color RGB color object
 * @returns HSV color object
 */
function rgbToHsv(color: RGBColor): { h: number; s: number; v: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  
  return { h, s: s * 100, v: v * 100 };
}

/**
 * Perform complete brightness analysis on color palette
 * @param colors Array of extracted colors
 * @returns Complete palette analysis
 */
export function analyzePalette(colors: ExtractedColor[]): PaletteAnalysis {
  const whiteColor = { r: 255, g: 255, b: 255 };
  
  const analyzedColors = colors.map(extractedColor => {
    const brightness = calculateBrightness(extractedColor.color);
    const category = categorizeBrightness(brightness);
    const contrast = calculateContrastRatio(extractedColor.color, whiteColor);
    const wcagLevel = getWCAGLevel(contrast);
    
    return {
      ...extractedColor,
      brightness,
      category,
      contrast,
      wcagLevel,
    };
  });
  
  const distribution = analyzeBrightnessDistribution(colors);
  const statistics = calculateBrightnessStatistics(colors);
  const harmony = analyzeHarmony(colors);
  
  return {
    colors: analyzedColors,
    distribution,
    statistics,
    harmony,
  };
}