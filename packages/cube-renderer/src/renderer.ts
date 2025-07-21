/**
 * Canvas-based 3D cube renderer
 */

import type {
  RGBColor,
  Point2D,
  CubeFace,
  CubeRenderConfig,
  ColorCube,
  CubeGrid,
  RenderResult,
} from './types';
import {
  generateCubeVertices,
  projectCubeVertices,
  getVisibleFaces,
  DEFAULT_PROJECTION,
} from './projection';
import {
  applyLighting,
  getIsometricFaceLighting,
  DEFAULT_LIGHTING,
} from './lighting';

/**
 * Default render configuration
 */
export const DEFAULT_RENDER_CONFIG: CubeRenderConfig = {
  size: 40,
  spacing: 10,
  projection: DEFAULT_PROJECTION,
  lighting: DEFAULT_LIGHTING,
  layout: {
    columns: 4,
  },
};

/**
 * Create a cube grid from colors
 */
export function createCubeGrid(
  colors: RGBColor[],
  config: Partial<CubeRenderConfig> = {}
): CubeGrid {
  const fullConfig = { ...DEFAULT_RENDER_CONFIG, ...config };
  const { size, spacing, layout } = fullConfig;
  
  const columns = layout.columns;
  const rows = layout.rows || Math.ceil(colors.length / columns);
  
  const cubes: ColorCube[] = colors.map((color, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    const position = {
      x: col * (size + spacing),
      y: row * (size + spacing),
      z: 0,
    };
    
    return createColorCube(position, color, size, fullConfig);
  });
  
  const bounds = {
    width: columns * (size + spacing) - spacing + size,
    height: rows * (size + spacing) - spacing + size,
  };
  
  return {
    cubes,
    config: fullConfig,
    bounds,
  };
}

/**
 * Create a single color cube
 */
export function createColorCube(
  position: Point2D & { z?: number },
  color: RGBColor,
  size: number,
  config: CubeRenderConfig
): ColorCube {
  const pos3D = { x: position.x, y: position.y, z: position.z || 0 };
  const vertices = generateCubeVertices(pos3D, size);
  const projectedVertices = projectCubeVertices(vertices, config.projection);
  
  // Get lighting intensities for the three visible faces
  const lightingIntensities = getIsometricFaceLighting(config);
  const visibleFaces = getVisibleFaces();
  
  const faces: CubeFace[] = visibleFaces.map((faceIndices, faceIndex) => {
    const facePoints = faceIndices.map(index => projectedVertices[index]);
    const brightness = lightingIntensities[faceIndex] || 1;
    
    return {
      points: facePoints,
      color: applyLighting(color, brightness),
      brightness,
    };
  });
  
  return {
    position: pos3D,
    color,
    faces,
  };
}

/**
 * Render cube grid to canvas
 */
export function renderCubeGrid(
  grid: CubeGrid,
  canvas?: HTMLCanvasElement
): RenderResult {
  const startTime = performance.now();
  
  // Create canvas if not provided
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }
  
  // Set canvas size
  canvas.width = grid.bounds.width + 100; // Add padding
  canvas.height = grid.bounds.height + 100;
  
  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Center the grid
  const offsetX = 50;
  const offsetY = 50;
  
  // Render all cubes
  for (const cube of grid.cubes) {
    renderCube(ctx, cube, offsetX, offsetY);
  }
  
  const renderTime = performance.now() - startTime;
  
  return {
    canvas,
    imageData: canvas.toDataURL(),
    renderTime,
    cubeCount: grid.cubes.length,
  };
}

/**
 * Render a single cube
 */
export function renderCube(
  ctx: CanvasRenderingContext2D,
  cube: ColorCube,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  // Render faces in order (back to front for proper depth)
  for (const face of cube.faces) {
    renderFace(ctx, face, offsetX, offsetY);
  }
}

/**
 * Render a single face
 */
export function renderFace(
  ctx: CanvasRenderingContext2D,
  face: CubeFace,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  if (face.points.length < 3) return;
  
  const { color } = face;
  
  ctx.save();
  
  // Begin path
  ctx.beginPath();
  const firstPoint = face.points[0];
  ctx.moveTo(firstPoint.x + offsetX, firstPoint.y + offsetY);
  
  // Draw face outline
  for (let i = 1; i < face.points.length; i++) {
    const point = face.points[i];
    ctx.lineTo(point.x + offsetX, point.y + offsetY);
  }
  ctx.closePath();
  
  // Fill face
  ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.fill();
  
  // Add subtle border
  ctx.strokeStyle = `rgb(${Math.max(0, color.r - 20)}, ${Math.max(0, color.g - 20)}, ${Math.max(0, color.b - 20)})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Utility function to convert colors and render directly
 */
export function renderColorPalette(
  colors: RGBColor[],
  config: Partial<CubeRenderConfig> = {},
  canvas?: HTMLCanvasElement
): RenderResult {
  const grid = createCubeGrid(colors, config);
  return renderCubeGrid(grid, canvas);
}