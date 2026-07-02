import { describe, it, expect } from 'vitest';
import { ImageSampler } from './sampling';
import type { RGBColor } from './types';

function createImageData(
  width: number,
  height: number,
  pixelAt: (x: number, y: number) => RGBColor
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = pixelAt(x, y);
      const index = (y * width + x) * 4;
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = 255;
    }
  }
  return { width, height, data } as unknown as ImageData;
}

describe('ImageSampler', () => {
  describe('uniformSample', () => {
    it('samples a solid-color image and returns that color for every sample', () => {
      const image = createImageData(8, 8, () => ({ r: 100, g: 150, b: 200 }));
      const samples = ImageSampler.uniformSample(image, 4);

      expect(samples.length).toBeGreaterThan(0);
      for (const sample of samples) {
        expect(sample.color).toEqual({ r: 100, g: 150, b: 200 });
      }
    });

    it('samples on a grid proportional to the requested count', () => {
      // left half red, right half blue
      const image = createImageData(4, 4, (x) =>
        x < 2 ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 255 }
      );
      const samples = ImageSampler.uniformSample(image, 4);

      expect(samples).toHaveLength(4);
      const colors = samples.map((s) => s.color);
      expect(colors).toContainEqual({ r: 255, g: 0, b: 0 });
      expect(colors).toContainEqual({ r: 0, g: 0, b: 255 });
    });
  });

  describe('importanceSample', () => {
    it('prioritizes pixels with high local color variation', () => {
      // checkerboard has maximum local variation everywhere in the interior
      const image = createImageData(6, 6, (x, y) =>
        (x + y) % 2 === 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }
      );
      const samples = ImageSampler.importanceSample(image, 5);

      expect(samples.length).toBeGreaterThan(0);
      for (const sample of samples) {
        expect(sample.importance).toBeGreaterThan(0.1);
      }
    });

    it('returns no samples for a uniform image (no variation)', () => {
      const image = createImageData(6, 6, () => ({ r: 10, g: 10, b: 10 }));
      const samples = ImageSampler.importanceSample(image, 5);
      expect(samples).toHaveLength(0);
    });
  });

  describe('edgeSample', () => {
    it('detects an edge between two solid-color halves', () => {
      const image = createImageData(8, 8, (x) =>
        x < 4 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }
      );
      const samples = ImageSampler.edgeSample(image, 5);

      expect(samples.length).toBeGreaterThan(0);
      for (const sample of samples) {
        expect(sample.edgeStrength).toBeGreaterThan(0.3);
      }
    });

    it('returns no samples for a uniform image (no edges)', () => {
      const image = createImageData(8, 8, () => ({ r: 50, g: 50, b: 50 }));
      const samples = ImageSampler.edgeSample(image, 5);
      expect(samples).toHaveLength(0);
    });
  });

  describe('hybridSample', () => {
    it('combines strategies and removes spatially close duplicates', () => {
      const image = createImageData(10, 10, (x, y) =>
        (x + y) % 2 === 0 ? { r: 200, g: 50, b: 50 } : { r: 50, g: 50, b: 200 }
      );
      const samples = ImageSampler.hybridSample(image, 20);

      expect(samples.length).toBeGreaterThan(0);
      expect(samples.length).toBeLessThanOrEqual(20);
      // no two samples should be at the exact same coordinate
      const coords = new Set(samples.map((s) => `${s.x},${s.y}`));
      expect(coords.size).toBe(samples.length);
    });
  });
});
