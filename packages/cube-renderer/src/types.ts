/**
 * 3D cube renderer type definitions
 */

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface CubeFace {
  points: Point2D[];
  color: RGBColor;
  brightness: number; // 0-1 for lighting effects
}

export interface IsometricProjection {
  angle: number; // rotation angle in degrees
  scale: number; // scale factor
  offsetX: number;
  offsetY: number;
}

export interface CubeRenderConfig {
  size: number; // base cube size in pixels
  spacing: number; // spacing between cubes
  projection: IsometricProjection;
  lighting: {
    ambient: number; // 0-1
    diffuse: number; // 0-1
    lightDirection: Point3D;
  };
  layout: {
    columns: number;
    rows?: number; // auto-calculated if not provided
  };
}

export interface CubeGrid {
  cubes: ColorCube[];
  config: CubeRenderConfig;
  bounds: {
    width: number;
    height: number;
  };
}

export interface ColorCube {
  position: Point3D;
  color: RGBColor;
  faces: CubeFace[];
  metadata?: {
    frequency?: number;
    importance?: number;
    representativeness?: number;
  };
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  imageData: string; // base64 data URL
  renderTime: number;
  cubeCount: number;
}