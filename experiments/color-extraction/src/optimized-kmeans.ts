import type { RGB, ColorData, ExtractionConfig } from './types.js';
import { createColorData } from './utils.js';

// 最適化されたLAB色空間変換（TypedArray使用）
export class OptimizedColorConverter {
  private static sRGBToLinearLUT: Float32Array | null = null;
  private static linearToLABLUT: Float32Array | null = null;

  static {
    this.initializeLUTs();
  }

  private static initializeLUTs(): void {
    // sRGB to Linear RGB lookup table (256エントリ)
    this.sRGBToLinearLUT = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const c = i / 255;
      this.sRGBToLinearLUT[i] =
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    // Linear to LAB function approximation LUT (1000エントリ)
    this.linearToLABLUT = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) {
      const t = i / 999;
      this.linearToLABLUT[i] =
        t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
    }
  }

  static fastRGBToLAB(
    r: number,
    g: number,
    b: number
  ): [number, number, number] {
    // Fast linear RGB conversion using LUT
    const rLinear = this.sRGBToLinearLUT![r];
    const gLinear = this.sRGBToLinearLUT![g];
    const bLinear = this.sRGBToLinearLUT![b];

    // Linear RGB to XYZ (D65 illuminant)
    let x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
    let y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175;
    let z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041;

    // Normalize to D65 white point
    x = x / 0.95047;
    y = y / 1.0;
    z = z / 1.08883;

    // Fast LAB conversion using LUT approximation
    const xIndex = Math.min(999, Math.floor(x * 999));
    const yIndex = Math.min(999, Math.floor(y * 999));
    const zIndex = Math.min(999, Math.floor(z * 999));

    const fx = this.linearToLABLUT![xIndex];
    const fy = this.linearToLABLUT![yIndex];
    const fz = this.linearToLABLUT![zIndex];

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bValue = 200 * (fy - fz);

    return [l, a, bValue];
  }
}

// 最適化されたサンプリング戦略
export class SmartSampler {
  static uniformSample(
    imageData: ImageData,
    maxSamples: number = 10000
  ): Float32Array {
    const { data, width, height } = imageData;
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / maxSamples));

    // RGB値を格納するTypedArray（各ピクセル3要素）
    const samples = new Float32Array(Math.min(totalPixels, maxSamples) * 3);
    let sampleIndex = 0;

    for (let i = 0; i < data.length; i += 4 * step) {
      const alpha = data[i + 3];
      if (alpha < 128) continue; // 透明ピクセルをスキップ

      if (sampleIndex >= samples.length) break;

      samples[sampleIndex++] = data[i]; // R
      samples[sampleIndex++] = data[i + 1]; // G
      samples[sampleIndex++] = data[i + 2]; // B
    }

    return samples.slice(0, sampleIndex);
  }

  static importanceSample(
    imageData: ImageData,
    maxSamples: number = 10000
  ): Float32Array {
    const { data, width, height } = imageData;

    // エッジ検出によるピクセル重要度計算
    const importance = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const pixelIdx = idx * 4;

        // Sobel edge detection
        const gx = this.sobelX(data, x, y, width, height);
        const gy = this.sobelY(data, x, y, width, height);
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        importance[idx] = magnitude;
      }
    }

    // 重要度に基づくサンプリング
    const samples: number[] = [];
    const threshold = this.calculateAdaptiveThreshold(importance);

    for (
      let i = 0;
      i < importance.length && samples.length < maxSamples * 3;
      i++
    ) {
      if (importance[i] > threshold || Math.random() < 0.1) {
        // 10%は必ずサンプル
        const pixelIdx = i * 4;
        if (data[pixelIdx + 3] >= 128) {
          // Alpha check
          samples.push(data[pixelIdx], data[pixelIdx + 1], data[pixelIdx + 2]);
        }
      }
    }

    return new Float32Array(samples);
  }

  private static sobelX(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    let sum = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const px = Math.min(Math.max(x + kx, 0), width - 1);
        const py = Math.min(Math.max(y + ky, 0), height - 1);
        const idx = (py * width + px) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray * kernel[(ky + 1) * 3 + (kx + 1)];
      }
    }

    return sum;
  }

  private static sobelY(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number
  ): number {
    const kernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    let sum = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const px = Math.min(Math.max(x + kx, 0), width - 1);
        const py = Math.min(Math.max(y + ky, 0), height - 1);
        const idx = (py * width + px) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray * kernel[(ky + 1) * 3 + (kx + 1)];
      }
    }

    return sum;
  }

  private static calculateAdaptiveThreshold(importance: Float32Array): number {
    const sorted = Array.from(importance).sort((a, b) => b - a);
    return sorted[Math.floor(sorted.length * 0.2)]; // 上位20%
  }
}

// 最適化されたK-meansアルゴリズム
export class OptimizedKMeansExtractor {
  private config: Required<ExtractionConfig>;

  constructor(config: ExtractionConfig) {
    this.config = {
      maxIterations: 100,
      convergenceThreshold: 1.0,
      ...config,
      algorithm: 'kmeans',
    };
  }

  extract(imageData: ImageData): ColorData[] {
    // スマートサンプリング
    const samples =
      this.config.colorCount > 16
        ? SmartSampler.importanceSample(imageData, 15000)
        : SmartSampler.uniformSample(imageData, 10000);

    if (samples.length === 0) return [];

    const numSamples = samples.length / 3;

    // K-means++初期化
    const centroids = this.initializeCentroidsPlus(
      samples,
      this.config.colorCount
    );

    // 最適化されたK-means実行
    const finalCentroids = this.runOptimizedKMeans(samples, centroids);

    // 結果をRGB形式に変換
    const results: RGB[] = [];
    for (let i = 0; i < finalCentroids.length; i += 3) {
      results.push({
        r: Math.round(finalCentroids[i]),
        g: Math.round(finalCentroids[i + 1]),
        b: Math.round(finalCentroids[i + 2]),
      });
    }

    return results.map(createColorData);
  }

  private initializeCentroidsPlus(
    samples: Float32Array,
    k: number
  ): Float32Array {
    const numSamples = samples.length / 3;
    const centroids = new Float32Array(k * 3);
    const chosenIndices = new Set<number>();

    // 最初のセントロイドをランダムに選択
    const firstIndex = Math.floor(Math.random() * numSamples);
    chosenIndices.add(firstIndex);
    centroids[0] = samples[firstIndex * 3];
    centroids[1] = samples[firstIndex * 3 + 1];
    centroids[2] = samples[firstIndex * 3 + 2];

    for (let c = 1; c < k; c++) {
      const distances = new Float32Array(numSamples);
      let totalDistance = 0;

      // 各ピクセルの最近セントロイドまでの距離を計算
      for (let i = 0; i < numSamples; i++) {
        if (chosenIndices.has(i)) {
          distances[i] = 0;
          continue;
        }

        let minDistance = Infinity;
        const [l, a, b] = OptimizedColorConverter.fastRGBToLAB(
          samples[i * 3],
          samples[i * 3 + 1],
          samples[i * 3 + 2]
        );

        for (let j = 0; j < c; j++) {
          const [cl, ca, cb] = OptimizedColorConverter.fastRGBToLAB(
            centroids[j * 3],
            centroids[j * 3 + 1],
            centroids[j * 3 + 2]
          );

          const distance = this.fastLABDistance(l, a, b, cl, ca, cb);
          minDistance = Math.min(minDistance, distance);
        }

        distances[i] = minDistance * minDistance;
        totalDistance += distances[i];
      }

      // 確率的選択
      let threshold = Math.random() * totalDistance;
      let selectedIndex = 0;

      for (let i = 0; i < numSamples; i++) {
        threshold -= distances[i];
        if (threshold <= 0) {
          selectedIndex = i;
          break;
        }
      }

      chosenIndices.add(selectedIndex);
      centroids[c * 3] = samples[selectedIndex * 3];
      centroids[c * 3 + 1] = samples[selectedIndex * 3 + 1];
      centroids[c * 3 + 2] = samples[selectedIndex * 3 + 2];
    }

    return centroids;
  }

  private runOptimizedKMeans(
    samples: Float32Array,
    initialCentroids: Float32Array
  ): Float32Array {
    const numSamples = samples.length / 3;
    const k = initialCentroids.length / 3;

    let centroids = new Float32Array(initialCentroids);
    const assignments = new Uint8Array(numSamples);
    const clusterSums = new Float32Array(k * 3);
    const clusterCounts = new Uint32Array(k);

    for (
      let iteration = 0;
      iteration < this.config.maxIterations;
      iteration++
    ) {
      // クラスター割り当て
      let hasChanged = false;

      for (let i = 0; i < numSamples; i++) {
        const [l, a, b] = OptimizedColorConverter.fastRGBToLAB(
          samples[i * 3],
          samples[i * 3 + 1],
          samples[i * 3 + 2]
        );

        let minDistance = Infinity;
        let newAssignment = 0;

        for (let j = 0; j < k; j++) {
          const [cl, ca, cb] = OptimizedColorConverter.fastRGBToLAB(
            centroids[j * 3],
            centroids[j * 3 + 1],
            centroids[j * 3 + 2]
          );

          const distance = this.fastLABDistance(l, a, b, cl, ca, cb);

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

      // セントロイド更新
      clusterSums.fill(0);
      clusterCounts.fill(0);

      for (let i = 0; i < numSamples; i++) {
        const cluster = assignments[i];
        const baseIndex = cluster * 3;

        clusterSums[baseIndex] += samples[i * 3];
        clusterSums[baseIndex + 1] += samples[i * 3 + 1];
        clusterSums[baseIndex + 2] += samples[i * 3 + 2];
        clusterCounts[cluster]++;
      }

      let totalMovement = 0;

      for (let i = 0; i < k; i++) {
        const baseIndex = i * 3;
        const count = clusterCounts[i];

        if (count > 0) {
          const newR = clusterSums[baseIndex] / count;
          const newG = clusterSums[baseIndex + 1] / count;
          const newB = clusterSums[baseIndex + 2] / count;

          // 移動距離を計算
          const dr = newR - centroids[baseIndex];
          const dg = newG - centroids[baseIndex + 1];
          const db = newB - centroids[baseIndex + 2];
          totalMovement += Math.sqrt(dr * dr + dg * dg + db * db);

          centroids[baseIndex] = newR;
          centroids[baseIndex + 1] = newG;
          centroids[baseIndex + 2] = newB;
        }
      }

      // 収束判定
      if (totalMovement / k < this.config.convergenceThreshold) {
        break;
      }
    }

    return centroids;
  }

  private fastLABDistance(
    l1: number,
    a1: number,
    b1: number,
    l2: number,
    a2: number,
    b2: number
  ): number {
    const dl = l1 - l2;
    const da = a1 - a2;
    const db = b1 - b2;
    return dl * dl + da * da + db * db; // 平方根計算を省略（比較のみ）
  }
}
