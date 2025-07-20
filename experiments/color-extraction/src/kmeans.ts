import type { RGB, ColorData, ExtractionConfig } from './types.js';
import { createColorData, rgbToLab } from './utils.js';

export class KMeansExtractor {
  private config: Required<ExtractionConfig>;

  constructor(config: ExtractionConfig) {
    this.config = {
      algorithm: 'kmeans',
      maxIterations: 100,
      convergenceThreshold: 1.0,
      ...config,
    };
  }

  extract(imageData: ImageData): ColorData[] {
    const pixels = this.samplePixels(imageData);
    const centroids = this.initializeCentroids(pixels, this.config.colorCount);

    return this.runKMeans(pixels, centroids);
  }

  private samplePixels(imageData: ImageData): RGB[] {
    const { data, width, height } = imageData;
    const pixels: RGB[] = [];

    // サンプリング率を動的に調整（最大10000ピクセル）
    const totalPixels = width * height;
    const maxSamples = 10000;
    const step = Math.max(1, Math.floor(totalPixels / maxSamples));

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      // 透明度が低いピクセルはスキップ
      if (alpha < 128) continue;

      pixels.push({ r, g, b });
    }

    return pixels;
  }

  private initializeCentroids(pixels: RGB[], k: number): RGB[] {
    // K-means++法による初期化
    const centroids: RGB[] = [];

    // 最初のセントロイドをランダムに選択
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

    // 残りのセントロイドを距離ベースで選択
    for (let i = 1; i < k; i++) {
      const distances = pixels.map((pixel) => {
        const minDistance = Math.min(
          ...centroids.map((centroid) =>
            this.calculateDistance(pixel, centroid)
          )
        );
        return minDistance * minDistance;
      });

      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      const threshold = Math.random() * totalDistance;

      let accumulator = 0;
      for (let j = 0; j < pixels.length; j++) {
        accumulator += distances[j];
        if (accumulator >= threshold) {
          centroids.push(pixels[j]);
          break;
        }
      }
    }

    return centroids;
  }

  private runKMeans(pixels: RGB[], initialCentroids: RGB[]): ColorData[] {
    let centroids = [...initialCentroids];
    let assignments = new Array(pixels.length).fill(0);

    for (
      let iteration = 0;
      iteration < this.config.maxIterations;
      iteration++
    ) {
      // ピクセルをクラスターに割り当て
      let hasChanged = false;
      for (let i = 0; i < pixels.length; i++) {
        const pixel = pixels[i];
        let minDistance = Infinity;
        let newAssignment = 0;

        for (let j = 0; j < centroids.length; j++) {
          const distance = this.calculateDistance(pixel, centroids[j]);
          if (distance < minDistance) {
            minDistance = distance;
            newAssignment = j;
          }
        }

        if (assignments[i] !== newAssignment) {
          assignments[i] = newAssignment;
          hasChanged = true;
        }
      }

      // セントロイドを更新
      const newCentroids = this.updateCentroids(
        pixels,
        assignments,
        centroids.length
      );

      // 収束判定
      const movement = this.calculateCentroidMovement(centroids, newCentroids);
      centroids = newCentroids;

      if (movement < this.config.convergenceThreshold) {
        break;
      }
    }

    return centroids.map(createColorData);
  }

  private calculateDistance(pixel1: RGB, pixel2: RGB): number {
    // LAB色空間での距離計算（より知覚的に正確）
    const lab1 = rgbToLab(pixel1);
    const lab2 = rgbToLab(pixel2);

    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  private updateCentroids(
    pixels: RGB[],
    assignments: number[],
    k: number
  ): RGB[] {
    const centroids: RGB[] = [];

    for (let i = 0; i < k; i++) {
      const clusterPixels = pixels.filter((_, idx) => assignments[idx] === i);

      if (clusterPixels.length === 0) {
        // 空のクラスターは既存のセントロイドを維持
        centroids.push({ r: 0, g: 0, b: 0 });
        continue;
      }

      const sum = clusterPixels.reduce(
        (acc, pixel) => ({
          r: acc.r + pixel.r,
          g: acc.g + pixel.g,
          b: acc.b + pixel.b,
        }),
        { r: 0, g: 0, b: 0 }
      );

      centroids.push({
        r: Math.round(sum.r / clusterPixels.length),
        g: Math.round(sum.g / clusterPixels.length),
        b: Math.round(sum.b / clusterPixels.length),
      });
    }

    return centroids;
  }

  private calculateCentroidMovement(
    oldCentroids: RGB[],
    newCentroids: RGB[]
  ): number {
    let totalMovement = 0;

    for (let i = 0; i < oldCentroids.length; i++) {
      const movement = this.calculateDistance(oldCentroids[i], newCentroids[i]);
      totalMovement += movement;
    }

    return totalMovement / oldCentroids.length;
  }
}
