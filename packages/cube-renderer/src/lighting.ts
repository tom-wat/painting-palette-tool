/**
 * Lighting calculations for 3D cube faces
 */

import type { Point3D, RGBColor, CubeRenderConfig } from './types';

/**
 * Calculate normal vector for a face defined by three points
 */
export function calculateNormal(p1: Point3D, p2: Point3D, p3: Point3D): Point3D {
  // Calculate two vectors from the three points
  const v1: Point3D = {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: p2.z - p1.z,
  };
  
  const v2: Point3D = {
    x: p3.x - p1.x,
    y: p3.y - p1.y,
    z: p3.z - p1.z,
  };
  
  // Calculate cross product for normal
  const normal: Point3D = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
  
  // Normalize the vector
  const magnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  
  if (magnitude === 0) {
    return { x: 0, y: 0, z: 1 }; // Default to up vector
  }
  
  return {
    x: normal.x / magnitude,
    y: normal.y / magnitude,
    z: normal.z / magnitude,
  };
}

/**
 * Calculate dot product of two 3D vectors
 */
export function dotProduct(v1: Point3D, v2: Point3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * Calculate lighting intensity for a face
 */
export function calculateLightingIntensity(
  normal: Point3D,
  lightDirection: Point3D,
  ambient: number,
  diffuse: number
): number {
  // Ensure light direction is normalized
  const magnitude = Math.sqrt(
    lightDirection.x ** 2 + lightDirection.y ** 2 + lightDirection.z ** 2
  );
  
  const normalizedLight: Point3D = {
    x: lightDirection.x / magnitude,
    y: lightDirection.y / magnitude,
    z: lightDirection.z / magnitude,
  };
  
  // Calculate diffuse lighting using dot product
  const diffuseIntensity = Math.max(0, dotProduct(normal, normalizedLight));
  
  // Combine ambient and diffuse lighting
  return Math.min(1, ambient + diffuse * diffuseIntensity);
}

/**
 * Apply lighting to a color
 */
export function applyLighting(color: RGBColor, intensity: number): RGBColor {
  return {
    r: Math.round(Math.min(255, Math.max(0, color.r * intensity))),
    g: Math.round(Math.min(255, Math.max(0, color.g * intensity))),
    b: Math.round(Math.min(255, Math.max(0, color.b * intensity))),
  };
}

/**
 * Get predefined lighting intensities for isometric cube faces
 */
export function getIsometricFaceLighting(config: CubeRenderConfig): number[] {
  const { ambient, diffuse, lightDirection } = config.lighting;
  
  // Predefined normals for standard isometric cube faces
  const faceNormals: Point3D[] = [
    { x: 0, y: 0, z: 1 },   // top face (brightest)
    { x: 0.866, y: 0, z: 0 }, // right face (medium)
    { x: 0, y: 0.866, z: 0 }, // front face (darkest)
  ];
  
  return faceNormals.map(normal =>
    calculateLightingIntensity(normal, lightDirection, ambient, diffuse)
  );
}

/**
 * Default lighting configuration for isometric cubes
 */
export const DEFAULT_LIGHTING = {
  ambient: 0.4,
  diffuse: 0.6,
  lightDirection: { x: -1, y: -1, z: 1 },
};