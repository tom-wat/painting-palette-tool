/**
 * Tests for cube renderer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCubeGrid,
  createColorCube,
  renderColorPalette,
  DEFAULT_RENDER_CONFIG,
} from './renderer';
import type { RGBColor } from './types';

// Mock canvas for testing
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 0;
  
  fillRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  fill() {}
  stroke() {}
  save() {}
  restore() {}
}

class MockCanvas {
  width = 0;
  height = 0;
  
  getContext(type: string) {
    if (type === '2d') {
      return new MockCanvasRenderingContext2D();
    }
    return null;
  }
  
  toDataURL() {
    return 'data:image/png;base64,mock';
  }
}

// Mock DOM
global.document = {
  createElement: (tagName: string) => {
    if (tagName === 'canvas') {
      return new MockCanvas() as any;
    }
    return null;
  },
} as any;

describe('Cube Renderer', () => {
  const testColors: RGBColor[] = [
    { r: 255, g: 0, b: 0 },     // Red
    { r: 0, g: 255, b: 0 },     // Green
    { r: 0, g: 0, b: 255 },     // Blue
    { r: 255, g: 255, b: 0 },   // Yellow
  ];

  describe('createCubeGrid', () => {
    it('should create cube grid with correct number of cubes', () => {
      const grid = createCubeGrid(testColors);
      
      expect(grid.cubes).toHaveLength(4);
      expect(grid.config).toBeDefined();
      expect(grid.bounds.width).toBeGreaterThan(0);
      expect(grid.bounds.height).toBeGreaterThan(0);
    });
    
    it('should arrange cubes in specified columns', () => {
      const config = { layout: { columns: 2 } };
      const grid = createCubeGrid(testColors, config);
      
      expect(grid.config.layout.columns).toBe(2);
      expect(grid.cubes[0].position.x).toBe(0);
      expect(grid.cubes[1].position.x).toBe(50); // size + spacing
      expect(grid.cubes[2].position.y).toBe(50); // second row
    });
    
    it('should handle custom spacing and size', () => {
      const config = { size: 60, spacing: 20 };
      const grid = createCubeGrid(testColors, config);
      
      expect(grid.config.size).toBe(60);
      expect(grid.config.spacing).toBe(20);
      expect(grid.cubes[1].position.x).toBe(80); // 60 + 20
    });
  });

  describe('createColorCube', () => {
    it('should create cube with correct position and color', () => {
      const position = { x: 0, y: 0, z: 0 };
      const color = { r: 255, g: 128, b: 64 };
      const cube = createColorCube(position, color, 40, DEFAULT_RENDER_CONFIG);
      
      expect(cube.position).toEqual(position);
      expect(cube.color).toEqual(color);
      expect(cube.faces).toHaveLength(3); // 3 visible faces in isometric view
    });
    
    it('should apply lighting to cube faces', () => {
      const position = { x: 0, y: 0, z: 0 };
      const color = { r: 255, g: 255, b: 255 };
      const cube = createColorCube(position, color, 40, DEFAULT_RENDER_CONFIG);
      
      // Check that faces have different brightness values
      const brightnesses = cube.faces.map(face => face.brightness);
      expect(new Set(brightnesses).size).toBeGreaterThan(1);
    });
  });

  describe('renderColorPalette', () => {
    it('should render palette and return result', () => {
      const result = renderColorPalette(testColors);
      
      expect(result.canvas).toBeDefined();
      expect(result.imageData).toBe('data:image/png;base64,mock');
      expect(result.renderTime).toBeGreaterThanOrEqual(0);
      expect(result.cubeCount).toBe(4);
    });
    
    it('should handle empty color array', () => {
      const result = renderColorPalette([]);
      
      expect(result.cubeCount).toBe(0);
      expect(result.canvas).toBeDefined();
    });
    
    it('should respect custom configuration', () => {
      const config = {
        size: 30,
        layout: { columns: 1 },
      };
      const result = renderColorPalette(testColors, config);
      
      expect(result.cubeCount).toBe(4);
    });
  });

  describe('integration', () => {
    it('should handle large color palettes', () => {
      const largeColorPalette: RGBColor[] = Array.from({ length: 16 }, (_, i) => ({
        r: (i * 16) % 256,
        g: (i * 32) % 256,
        b: (i * 64) % 256,
      }));
      
      const result = renderColorPalette(largeColorPalette, {
        layout: { columns: 4 },
      });
      
      expect(result.cubeCount).toBe(16);
      expect(result.renderTime).toBeGreaterThanOrEqual(0);
    });
  });
});