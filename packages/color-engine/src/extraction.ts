/**
 * Color extraction algorithms
 * Based on Phase 0 verification - hybrid approach for optimal quality
 */

import {
  RGBColor,
  ExtractedColor,
  SampledPixel,
  ExtractionConfig,
  ExtractionResult,
} from './types.js';
import { ColorSpaceConverter } from './color-space.js';

export class ColorExtractor {
  /**
   * Hybrid color extraction (Phase 0 verified as highest quality)
   * Combines Octree (40%) + MedianCut (30%) + K-means (30%)
   */
  static async extractColors(
    samples: SampledPixel[],
    config: ExtractionConfig
  ): Promise<ExtractionResult> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();

    const colors = samples.map((s) => s.color);
    let extractedColors: ExtractedColor[] = [];

    switch (config.algorithm) {
      case 'octree':
        extractedColors = this.octreeQuantization(
          colors,
          config.targetColorCount
        );
        break;
      case 'mediancut':
        extractedColors = this.medianCutQuantization(
          colors,
          config.targetColorCount
        );
        break;
      case 'kmeans':
        extractedColors = this.kmeansQuantization(
          colors,
          config.targetColorCount
        );
        break;
      case 'hybrid':
      default:
        extractedColors = this.hybridQuantization(
          colors,
          config.targetColorCount
        );
        break;
    }

    const extractionTime = performance.now() - startTime;
    const memoryAfter = this.getMemoryUsage();
    const memoryUsage = memoryAfter - memoryBefore;

    const qualityScore = this.calculateQualityScore(extractedColors);

    return {
      colors: extractedColors,
      algorithm: config.algorithm,
      extractionTime,
      qualityScore,
      memoryUsage,
      colorCount: extractedColors.length,
    };
  }

  /**
   * Hybrid quantization combining multiple algorithms
   */
  private static hybridQuantization(
    colors: RGBColor[],
    targetCount: number
  ): ExtractedColor[] {
    const octreeCount = Math.floor(targetCount * 0.4);
    const medianCutCount = Math.floor(targetCount * 0.3);
    const kmeansCount = targetCount - octreeCount - medianCutCount;

    const octreeColors = this.octreeQuantization(colors, octreeCount);
    const medianCutColors = this.medianCutQuantization(colors, medianCutCount);
    const kmeansColors = this.kmeansQuantization(colors, kmeansCount);

    // Combine and deduplicate
    const allColors = [...octreeColors, ...medianCutColors, ...kmeansColors];
    return this.mergeAndOptimizeColors(allColors, targetCount);
  }

  /**
   * Octree quantization - fastest algorithm
   */
  private static octreeQuantization(
    colors: RGBColor[],
    targetCount: number
  ): ExtractedColor[] {
    const octree = new OctreeNode();

    // Build octree
    for (const color of colors) {
      octree.addColor(color);
    }

    // Reduce to target count
    octree.reduce(targetCount);

    // Extract colors
    const extractedColors: ExtractedColor[] = [];
    octree.getLeafNodes().forEach((node) => {
      if (node.pixelCount > 0) {
        const color: RGBColor = {
          r: Math.round(node.redSum / node.pixelCount),
          g: Math.round(node.greenSum / node.pixelCount),
          b: Math.round(node.blueSum / node.pixelCount),
        };

        extractedColors.push({
          color,
          frequency: node.pixelCount / colors.length,
          importance: 0.8, // Octree has good frequency-based importance
          representativeness: 0.7,
        });
      }
    });

    return extractedColors.slice(0, targetCount);
  }

  /**
   * Median Cut quantization - good for main colors
   */
  private static medianCutQuantization(
    colors: RGBColor[],
    targetCount: number
  ): ExtractedColor[] {
    const colorBoxes = [new ColorBox(colors)];

    // Split until we have target count
    while (colorBoxes.length < targetCount) {
      // Find box with largest volume
      let largestBox = colorBoxes[0]!;
      let largestIndex = 0;

      for (let i = 1; i < colorBoxes.length; i++) {
        if (colorBoxes[i]!.getVolume() > largestBox.getVolume()) {
          largestBox = colorBoxes[i]!;
          largestIndex = i;
        }
      }

      // Split the largest box
      const splitBoxes = largestBox.split();
      if (splitBoxes.length === 2) {
        colorBoxes.splice(largestIndex, 1, ...splitBoxes);
      } else {
        break; // Cannot split further
      }
    }

    // Extract representative colors
    return colorBoxes.map((box) => {
      const avgColor = box.getAverageColor();
      return {
        color: avgColor,
        frequency: box.colors.length / colors.length,
        importance: 0.85, // Median cut has good representativeness
        representativeness: 0.9,
      };
    });
  }

  /**
   * K-means quantization - highest quality clusters
   */
  private static kmeansQuantization(
    colors: RGBColor[],
    targetCount: number
  ): ExtractedColor[] {
    if (colors.length === 0) return [];

    // Initialize centroids using K-means++
    const centroids = this.initializeKMeansPlusPlusCentroids(
      colors,
      targetCount
    );
    const maxIterations = 20;
    let converged = false;

    for (
      let iteration = 0;
      iteration < maxIterations && !converged;
      iteration++
    ) {
      const clusters: RGBColor[][] = Array.from(
        { length: targetCount },
        () => []
      );

      // Assign colors to nearest centroid
      for (const color of colors) {
        let minDistance = Infinity;
        let bestCluster = 0;

        for (let i = 0; i < centroids.length; i++) {
          const distance = ColorSpaceConverter.calculateRgbDistance(
            color,
            centroids[i]!
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestCluster = i;
          }
        }

        clusters[bestCluster]!.push(color);
      }

      // Update centroids
      converged = true;
      for (let i = 0; i < centroids.length; i++) {
        if (clusters[i]!.length > 0) {
          const newCentroid = this.calculateCentroid(clusters[i]!);
          const distance = ColorSpaceConverter.calculateRgbDistance(
            centroids[i]!,
            newCentroid
          );

          if (distance > 1.0) {
            converged = false;
          }

          centroids[i] = newCentroid;
        }
      }
    }

    // Create extracted colors
    return centroids.map((centroid, index) => {
      const clusterSize = colors.filter((color) => {
        let minDistance = Infinity;
        let bestCentroid = 0;

        for (let i = 0; i < centroids.length; i++) {
          const distance = ColorSpaceConverter.calculateRgbDistance(
            color,
            centroids[i]!
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestCentroid = i;
          }
        }

        return bestCentroid === index;
      }).length;

      return {
        color: centroid,
        frequency: clusterSize / colors.length,
        importance: 0.9, // K-means has excellent cluster quality
        representativeness: 0.95,
      };
    });
  }

  /**
   * K-means++ initialization for better convergence
   */
  private static initializeKMeansPlusPlusCentroids(
    colors: RGBColor[],
    k: number
  ): RGBColor[] {
    const centroids: RGBColor[] = [];

    // Choose first centroid randomly
    centroids.push(colors[Math.floor(Math.random() * colors.length)]!);

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      const distances = colors.map((color) => {
        let minDistance = Infinity;
        for (const centroid of centroids) {
          const distance = ColorSpaceConverter.calculateRgbDistance(
            color,
            centroid
          );
          minDistance = Math.min(minDistance, distance);
        }
        return minDistance * minDistance; // Squared distance for probability
      });

      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      const threshold = Math.random() * totalDistance;

      let sum = 0;
      for (let j = 0; j < colors.length; j++) {
        sum += distances[j]!;
        if (sum >= threshold) {
          centroids.push(colors[j]!);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Calculate centroid of color cluster
   */
  private static calculateCentroid(colors: RGBColor[]): RGBColor {
    const sum = colors.reduce(
      (acc, color) => ({
        r: acc.r + color.r,
        g: acc.g + color.g,
        b: acc.b + color.b,
      }),
      { r: 0, g: 0, b: 0 }
    );

    return {
      r: Math.round(sum.r / colors.length),
      g: Math.round(sum.g / colors.length),
      b: Math.round(sum.b / colors.length),
    };
  }

  /**
   * Merge and optimize combined colors from multiple algorithms
   */
  private static mergeAndOptimizeColors(
    colors: ExtractedColor[],
    targetCount: number
  ): ExtractedColor[] {
    // Remove similar colors
    const mergedColors: ExtractedColor[] = [];
    const threshold = 15; // RGB distance threshold

    for (const color of colors) {
      const similar = mergedColors.find(
        (existing) =>
          ColorSpaceConverter.calculateRgbDistance(
            color.color,
            existing.color
          ) < threshold
      );

      if (similar) {
        // Merge with existing color
        similar.frequency = Math.max(similar.frequency, color.frequency);
        similar.importance = Math.max(similar.importance, color.importance);
        similar.representativeness = Math.max(
          similar.representativeness,
          color.representativeness
        );
      } else {
        mergedColors.push(color);
      }
    }

    // Sort by overall score and take top colors
    mergedColors.sort((a, b) => {
      const scoreA =
        a.frequency * 0.4 + a.importance * 0.3 + a.representativeness * 0.3;
      const scoreB =
        b.frequency * 0.4 + b.importance * 0.3 + b.representativeness * 0.3;
      return scoreB - scoreA;
    });

    return mergedColors.slice(0, targetCount);
  }

  /**
   * Calculate quality score for extracted colors
   */
  private static calculateQualityScore(colors: ExtractedColor[]): number {
    if (colors.length === 0) return 0;

    // Diversity score (average pairwise distance)
    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const lab1 = ColorSpaceConverter.rgbToLab(colors[i]!.color);
        const lab2 = ColorSpaceConverter.rgbToLab(colors[j]!.color);
        totalDistance += ColorSpaceConverter.calculateDeltaE(lab1, lab2);
        pairCount++;
      }
    }

    const averageDistance = pairCount > 0 ? totalDistance / pairCount : 0;
    const normalizedDistance = Math.min(averageDistance / 50, 1); // Normalize to 0-1

    // Overall quality combining multiple factors
    const averageImportance =
      colors.reduce((sum, c) => sum + c.importance, 0) / colors.length;
    const averageRepresentativeness =
      colors.reduce((sum, c) => sum + c.representativeness, 0) / colors.length;

    return (
      normalizedDistance * 0.4 +
      averageImportance * 0.3 +
      averageRepresentativeness * 0.3
    );
  }

  private static getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

// Helper classes for algorithms

class OctreeNode {
  children: OctreeNode[] = new Array(8).fill(null);
  isLeaf: boolean = false;
  pixelCount: number = 0;
  redSum: number = 0;
  greenSum: number = 0;
  blueSum: number = 0;

  addColor(color: RGBColor): void {
    this.addColorRecursive(color, 0);
  }

  private addColorRecursive(color: RGBColor, level: number): void {
    if (level >= 8) {
      this.isLeaf = true;
      this.pixelCount++;
      this.redSum += color.r;
      this.greenSum += color.g;
      this.blueSum += color.b;
      return;
    }

    const index = this.getIndex(color, level);
    if (!this.children[index]) {
      this.children[index] = new OctreeNode();
    }
    this.children[index]!.addColorRecursive(color, level + 1);
  }

  private getIndex(color: RGBColor, level: number): number {
    const shift = 7 - level;
    return (
      (((color.r >> shift) & 1) << 2) |
      (((color.g >> shift) & 1) << 1) |
      ((color.b >> shift) & 1)
    );
  }

  reduce(targetCount: number): void {
    // Simplified reduction - in production, implement proper leaf counting
    const leafNodes = this.getLeafNodes();
    if (leafNodes.length <= targetCount) return;

    // Sort by pixel count and merge smallest nodes
    leafNodes.sort((a, b) => a.pixelCount - b.pixelCount);

    for (let i = 0; i < leafNodes.length - targetCount; i++) {
      const node = leafNodes[i]!;
      node.isLeaf = false;
      node.pixelCount = 0;
    }
  }

  getLeafNodes(): OctreeNode[] {
    const leaves: OctreeNode[] = [];
    this.collectLeaves(leaves);
    return leaves;
  }

  private collectLeaves(leaves: OctreeNode[]): void {
    if (this.isLeaf) {
      leaves.push(this);
    } else {
      for (const child of this.children) {
        if (child) {
          child.collectLeaves(leaves);
        }
      }
    }
  }
}

class ColorBox {
  colors: RGBColor[];
  minR: number = 255;
  maxR: number = 0;
  minG: number = 255;
  maxG: number = 0;
  minB: number = 255;
  maxB: number = 0;

  constructor(colors: RGBColor[]) {
    this.colors = colors;
    this.calculateBounds();
  }

  private calculateBounds(): void {
    for (const color of this.colors) {
      this.minR = Math.min(this.minR, color.r);
      this.maxR = Math.max(this.maxR, color.r);
      this.minG = Math.min(this.minG, color.g);
      this.maxG = Math.max(this.maxG, color.g);
      this.minB = Math.min(this.minB, color.b);
      this.maxB = Math.max(this.maxB, color.b);
    }
  }

  getVolume(): number {
    return (
      (this.maxR - this.minR) *
      (this.maxG - this.minG) *
      (this.maxB - this.minB)
    );
  }

  getLargestDimension(): 'r' | 'g' | 'b' {
    const rRange = this.maxR - this.minR;
    const gRange = this.maxG - this.minG;
    const bRange = this.maxB - this.minB;

    if (rRange >= gRange && rRange >= bRange) return 'r';
    if (gRange >= bRange) return 'g';
    return 'b';
  }

  split(): ColorBox[] {
    if (this.colors.length <= 1) return [this];

    const dimension = this.getLargestDimension();
    this.colors.sort((a, b) => a[dimension] - b[dimension]);

    const midIndex = Math.floor(this.colors.length / 2);
    const colors1 = this.colors.slice(0, midIndex);
    const colors2 = this.colors.slice(midIndex);

    return [new ColorBox(colors1), new ColorBox(colors2)];
  }

  getAverageColor(): RGBColor {
    const sum = this.colors.reduce(
      (acc, color) => ({
        r: acc.r + color.r,
        g: acc.g + color.g,
        b: acc.b + color.b,
      }),
      { r: 0, g: 0, b: 0 }
    );

    return {
      r: Math.round(sum.r / this.colors.length),
      g: Math.round(sum.g / this.colors.length),
      b: Math.round(sum.b / this.colors.length),
    };
  }
}
