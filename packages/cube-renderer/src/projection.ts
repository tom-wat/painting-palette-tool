/**
 * Isometric projection and 3D transformation utilities
 */

import type { Point3D, Point2D, IsometricProjection } from './types';

/**
 * Default isometric projection settings
 */
export const DEFAULT_PROJECTION: IsometricProjection = {
  angle: 30, // 30-degree isometric angle
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Convert 3D point to 2D isometric projection
 */
export function projectToIsometric(
  point: Point3D,
  projection: IsometricProjection = DEFAULT_PROJECTION
): Point2D {
  const { angle, scale, offsetX, offsetY } = projection;
  const rad = (angle * Math.PI) / 180;
  
  const cos30 = Math.cos(rad);
  const sin30 = Math.sin(rad);
  
  // Isometric transformation matrix
  const x = (point.x - point.z) * cos30 * scale + offsetX;
  const y = (point.x + point.z) * sin30 - point.y * scale + offsetY;
  
  return { x, y };
}

/**
 * Generate 3D cube vertices for a given position and size
 */
export function generateCubeVertices(
  position: Point3D,
  size: number
): Point3D[] {
  const { x, y, z } = position;
  const half = size / 2;
  
  return [
    // Bottom face (z = z - half)
    { x: x - half, y: y - half, z: z - half }, // 0: bottom-back-left
    { x: x + half, y: y - half, z: z - half }, // 1: bottom-back-right
    { x: x + half, y: y + half, z: z - half }, // 2: bottom-front-right
    { x: x - half, y: y + half, z: z - half }, // 3: bottom-front-left
    
    // Top face (z = z + half)
    { x: x - half, y: y - half, z: z + half }, // 4: top-back-left
    { x: x + half, y: y - half, z: z + half }, // 5: top-back-right
    { x: x + half, y: y + half, z: z + half }, // 6: top-front-right
    { x: x - half, y: y + half, z: z + half }, // 7: top-front-left
  ];
}

/**
 * Project cube vertices to 2D points
 */
export function projectCubeVertices(
  vertices: Point3D[],
  projection: IsometricProjection
): Point2D[] {
  return vertices.map(vertex => projectToIsometric(vertex, projection));
}

/**
 * Calculate cube face ordering for proper depth sorting
 */
export function getCubeFaceOrder(): number[][] {
  // Define faces by vertex indices, ordered for proper visibility
  return [
    [0, 1, 2, 3], // bottom face
    [4, 7, 6, 5], // top face
    [0, 4, 5, 1], // back face
    [2, 6, 7, 3], // front face
    [0, 3, 7, 4], // left face
    [1, 5, 6, 2], // right face
  ];
}

/**
 * Get visible faces for isometric view (typically top, right, and front)
 */
export function getVisibleFaces(): number[][] {
  return [
    [4, 7, 6, 5], // top face
    [1, 5, 6, 2], // right face
    [2, 6, 7, 3], // front face
  ];
}