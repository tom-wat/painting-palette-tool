/**
 * 3D Isometric Cube Renderer
 * 
 * Renders color palettes as 3D isometric cubes with proper lighting
 * and depth visualization for painting reference.
 */

// Core types
export type {
  RGBColor,
  Point3D,
  Point2D,
  CubeFace,
  IsometricProjection,
  CubeRenderConfig,
  CubeGrid,
  ColorCube,
  RenderResult,
} from './types';

// Projection utilities
export {
  projectToIsometric,
  generateCubeVertices,
  projectCubeVertices,
  getCubeFaceOrder,
  getVisibleFaces,
  DEFAULT_PROJECTION,
} from './projection';

// Lighting utilities
export {
  calculateNormal,
  dotProduct,
  calculateLightingIntensity,
  applyLighting,
  getIsometricFaceLighting,
  DEFAULT_LIGHTING,
} from './lighting';

// Main renderer
export {
  createCubeGrid,
  createColorCube,
  renderCubeGrid,
  renderCube,
  renderFace,
  renderColorPalette,
  DEFAULT_RENDER_CONFIG,
} from './renderer';

// Default export for easy usage
export { renderColorPalette as default } from './renderer';