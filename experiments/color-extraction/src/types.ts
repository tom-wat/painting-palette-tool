export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface ColorData {
  rgb: RGB;
  hex: string;
  lab: LAB;
  luminance: number;
  temperature: 'warm' | 'cool' | 'neutral';
  paintingRole: 'highlight' | 'midtone' | 'shadow';
}

export interface ExtractionConfig {
  algorithm?: 'kmeans' | 'octree' | 'median-cut';
  colorCount: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

export interface BenchmarkResult {
  algorithm: string;
  duration: number;
  memoryUsage: number;
  colorAccuracy: number;
}
