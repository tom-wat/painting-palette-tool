export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface ColorData {
  rgb: [number, number, number];
  hex: string;
  luminance: number;
  role: 'highlight' | 'midtone' | 'shadow';
}

export interface CubeGeometry {
  vertices: Point3D[];
  faces: number[][];
  normals: Point3D[];
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  frameCount: number;
}

export interface BenchmarkResult {
  renderer: string;
  avgFps: number;
  avgRenderTime: number;
  maxMemory: number;
  stability: number; // FPS variance
}
