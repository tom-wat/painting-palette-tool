/**
 * Image sampling strategies
 * Based on Phase 0 verification - optimized for quality vs performance
 */

import { RGBColor, SampledPixel } from './types.js';

export class ImageSampler {
  /**
   * Hybrid sampling strategy (Phase 0 verified as highest quality)
   * Combines uniform (40%) + importance (30%) + edge (30%) sampling
   */
  static hybridSample(
    imageData: ImageData,
    targetSampleCount: number
  ): SampledPixel[] {
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    // Calculate sample counts for each strategy
    const uniformCount = Math.floor(targetSampleCount * 0.4);
    const importanceCount = Math.floor(targetSampleCount * 0.3);
    const edgeCount = targetSampleCount - uniformCount - importanceCount;

    // 1. Uniform sampling (40%)
    const uniformSamples = this.uniformSample(imageData, uniformCount);
    samples.push(...uniformSamples);

    // 2. Importance sampling (30%)
    const importanceSamples = this.importanceSample(imageData, importanceCount);
    samples.push(...importanceSamples);

    // 3. Edge sampling (30%)
    const edgeSamples = this.edgeSample(imageData, edgeCount);
    samples.push(...edgeSamples);

    // Remove duplicates based on spatial proximity
    return this.removeSpatialDuplicates(samples, width, height);
  }

  /**
   * Uniform grid-based sampling
   */
  static uniformSample(
    imageData: ImageData,
    sampleCount: number
  ): SampledPixel[] {
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    const gridSize = Math.sqrt(sampleCount);
    const stepX = width / gridSize;
    const stepY = height / gridSize;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = Math.floor(i * stepX + stepX / 2);
        const y = Math.floor(j * stepY + stepY / 2);

        if (x < width && y < height) {
          const index = (y * width + x) * 4;
          const color: RGBColor = {
            r: data[index]!,
            g: data[index + 1]!,
            b: data[index + 2]!,
          };

          samples.push({ x, y, color });
        }
      }
    }

    return samples;
  }

  /**
   * Importance-based sampling (color variation priority)
   */
  static importanceSample(
    imageData: ImageData,
    sampleCount: number
  ): SampledPixel[] {
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    // Calculate importance map based on local color variation
    const importanceMap = this.calculateImportanceMap(imageData);

    // Sample based on importance weights
    const candidates: Array<{ x: number; y: number; importance: number }> = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const importance = importanceMap[y * width + x]!;
        if (importance > 0.1) {
          // Threshold for significant variation
          candidates.push({ x, y, importance });
        }
      }
    }

    // Sort by importance and take top samples
    candidates.sort((a, b) => b.importance - a.importance);
    const selectedCandidates = candidates.slice(0, sampleCount);

    for (const candidate of selectedCandidates) {
      const index = (candidate.y * width + candidate.x) * 4;
      const color: RGBColor = {
        r: data[index]!,
        g: data[index + 1]!,
        b: data[index + 2]!,
      };

      samples.push({
        x: candidate.x,
        y: candidate.y,
        color,
        importance: candidate.importance,
      });
    }

    return samples;
  }

  /**
   * Edge-priority sampling using Sobel filter
   */
  static edgeSample(imageData: ImageData, sampleCount: number): SampledPixel[] {
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    // Calculate edge strength map using Sobel filter
    const edgeMap = this.calculateEdgeMap(imageData);

    // Find edge pixels
    const edgePixels: Array<{ x: number; y: number; strength: number }> = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const strength = edgeMap[y * width + x]!;
        if (strength > 0.3) {
          // Edge threshold
          edgePixels.push({ x, y, strength });
        }
      }
    }

    // Sort by edge strength and sample
    edgePixels.sort((a, b) => b.strength - a.strength);
    const selectedPixels = edgePixels.slice(0, sampleCount);

    for (const pixel of selectedPixels) {
      const index = (pixel.y * width + pixel.x) * 4;
      const color: RGBColor = {
        r: data[index]!,
        g: data[index + 1]!,
        b: data[index + 2]!,
      };

      samples.push({
        x: pixel.x,
        y: pixel.y,
        color,
        edgeStrength: pixel.strength,
      });
    }

    return samples;
  }

  /**
   * Calculate importance map based on local color variation
   */
  private static calculateImportanceMap(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const importanceMap = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = (y * width + x) * 4;
        const currentR = data[index]!;
        const currentG = data[index + 1]!;
        const currentB = data[index + 2]!;

        let totalVariation = 0;
        let neighborCount = 0;

        // Check 8 neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIndex = (ny * width + nx) * 4;
              const nr = data[nIndex]!;
              const ng = data[nIndex + 1]!;
              const nb = data[nIndex + 2]!;

              const colorDiff = Math.sqrt(
                Math.pow(currentR - nr, 2) +
                  Math.pow(currentG - ng, 2) +
                  Math.pow(currentB - nb, 2)
              );

              totalVariation += colorDiff;
              neighborCount++;
            }
          }
        }

        importanceMap[y * width + x] =
          totalVariation / (neighborCount * 255 * Math.sqrt(3));
      }
    }

    return importanceMap;
  }

  /**
   * Calculate edge map using Sobel filter
   */
  private static calculateEdgeMap(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const edgeMap = new Float32Array(width * height);

    // Sobel kernels
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            const index = (py * width + px) * 4;

            // Use luminance for edge detection
            const luminance =
              0.299 * data[index]! +
              0.587 * data[index + 1]! +
              0.114 * data[index + 2]!;

            gx += luminance * sobelX[ky]![kx]!;
            gy += luminance * sobelY[ky]![kx]!;
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy) / 255;
        edgeMap[y * width + x] = magnitude;
      }
    }

    return edgeMap;
  }

  /**
   * Remove spatially close duplicates
   */
  private static removeSpatialDuplicates(
    samples: SampledPixel[],
    width: number,
    height: number
  ): SampledPixel[] {
    const result: SampledPixel[] = [];
    const minDistance = Math.sqrt((width * height) / samples.length) * 0.5;

    for (const sample of samples) {
      const tooClose = result.some((existing) => {
        const distance = Math.sqrt(
          Math.pow(sample.x - existing.x, 2) +
            Math.pow(sample.y - existing.y, 2)
        );
        return distance < minDistance;
      });

      if (!tooClose) {
        result.push(sample);
      }
    }

    return result;
  }
}
