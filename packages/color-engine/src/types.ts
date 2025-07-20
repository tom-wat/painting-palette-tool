/**
 * Color engine type definitions
 */

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSVColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface LABColor {
  l: number; // 0-100
  a: number; // -128 to +128
  b: number; // -128 to +128
}

export interface ExtractedColor {
  color: RGBColor;
  frequency: number;
  importance: number;
  representativeness: number;
}

export interface SampledPixel {
  x: number;
  y: number;
  color: RGBColor;
  importance?: number;
  edgeStrength?: number;
}

export interface ExtractionConfig {
  targetColorCount: number;
  maxColorCount: number;
  qualityThreshold: number;
  colorDistanceThreshold: number;
  algorithm: 'octree' | 'mediancut' | 'kmeans' | 'hybrid';
  samplingStrategy: 'uniform' | 'importance' | 'edge' | 'hybrid';
}

export interface ExtractionResult {
  colors: ExtractedColor[];
  algorithm: string;
  extractionTime: number;
  qualityScore: number;
  memoryUsage: number;
  colorCount: number;
}
