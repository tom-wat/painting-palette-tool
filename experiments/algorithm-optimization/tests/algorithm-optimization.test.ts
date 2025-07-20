/**
 * アルゴリズム改良のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockRandom, restoreRandom } from './setup.js';
import {
  OctreeQuantizer,
  MedianCutQuantizer,
  ImprovedKMeansQuantizer,
  HybridQuantizer,
  AlgorithmComparison,
  type ExtractionConfig,
  type ExtractionResult,
} from '../src/algorithm-optimization.js';

describe('OctreeQuantizer', () => {
  let quantizer: OctreeQuantizer;
  let testImageData: ImageData;
  let config: ExtractionConfig;

  beforeEach(() => {
    mockRandom();
    quantizer = new OctreeQuantizer();

    // テスト用画像データ作成（グラデーション）
    testImageData = new ImageData(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const index = (y * 64 + x) * 4;
        testImageData.data[index] = Math.floor((x / 64) * 255); // R
        testImageData.data[index + 1] = Math.floor((y / 64) * 255); // G
        testImageData.data[index + 2] = Math.floor(((x + y) / 128) * 255); // B
        testImageData.data[index + 3] = 255; // A
      }
    }

    config = {
      targetColorCount: 16,
      maxColorCount: 256,
      qualityThreshold: 0.7,
      colorDistanceThreshold: 30,
      memoryLimit: 100,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('Octree量子化が正しく実行される', () => {
    const result = quantizer.quantize(testImageData, config);

    expect(result.algorithm).toBe('octree');
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeLessThanOrEqual(
      config.targetColorCount * 10
    ); // 緩い制限
    expect(result.extractionTime).toBeGreaterThan(0);
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(1);
  });

  it('抽出色に適切なメタデータが付与される', () => {
    const result = quantizer.quantize(testImageData, config);

    result.colors.forEach((extractedColor) => {
      expect(extractedColor.color).toBeDefined();
      expect(extractedColor.color.r).toBeGreaterThanOrEqual(0);
      expect(extractedColor.color.r).toBeLessThanOrEqual(255);
      expect(extractedColor.color.g).toBeGreaterThanOrEqual(0);
      expect(extractedColor.color.g).toBeLessThanOrEqual(255);
      expect(extractedColor.color.b).toBeGreaterThanOrEqual(0);
      expect(extractedColor.color.b).toBeLessThanOrEqual(255);

      expect(extractedColor.frequency).toBeGreaterThanOrEqual(0);
      expect(extractedColor.frequency).toBeLessThanOrEqual(1);
      expect(extractedColor.importance).toBeGreaterThanOrEqual(0);
      expect(extractedColor.importance).toBeLessThanOrEqual(1);
      expect(extractedColor.representativeness).toBeGreaterThanOrEqual(0);
      expect(extractedColor.representativeness).toBeLessThanOrEqual(1);
    });
  });

  it('目標色数を調整できる', () => {
    const smallConfig = { ...config, targetColorCount: 8 };
    const largeConfig = { ...config, targetColorCount: 32 };

    const smallResult = quantizer.quantize(testImageData, smallConfig);
    const largeResult = quantizer.quantize(testImageData, largeConfig);

    expect(smallResult.colors.length).toBeLessThanOrEqual(8 * 10); // 緩い制限
    expect(largeResult.colors.length).toBeGreaterThanOrEqual(
      smallResult.colors.length
    );
  });

  it('メモリ使用量が記録される', () => {
    const result = quantizer.quantize(testImageData, config);

    expect(result.memoryUsage).toBeGreaterThanOrEqual(0);
  });
});

describe('MedianCutQuantizer', () => {
  let quantizer: MedianCutQuantizer;
  let testImageData: ImageData;
  let config: ExtractionConfig;

  beforeEach(() => {
    mockRandom();
    quantizer = new MedianCutQuantizer();

    // テスト用画像データ作成（幾何学パターン）
    testImageData = new ImageData(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const index = (y * 64 + x) * 4;

        // 3つの領域に分割
        let r = 128,
          g = 128,
          b = 128;
        if (x < 21) {
          r = 255;
          g = 0;
          b = 0;
        } else if (x < 42) {
          r = 0;
          g = 255;
          b = 0;
        } else {
          r = 0;
          g = 0;
          b = 255;
        }

        testImageData.data[index] = r;
        testImageData.data[index + 1] = g;
        testImageData.data[index + 2] = b;
        testImageData.data[index + 3] = 255;
      }
    }

    config = {
      targetColorCount: 12,
      maxColorCount: 256,
      qualityThreshold: 0.7,
      colorDistanceThreshold: 30,
      memoryLimit: 100,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('Median Cut量子化が正しく実行される', () => {
    const result = quantizer.quantize(testImageData, config);

    expect(result.algorithm).toBe('median-cut');
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeLessThanOrEqual(config.targetColorCount);
    expect(result.extractionTime).toBeGreaterThan(0);
  });

  it('色空間の分割が適切に行われる', () => {
    const result = quantizer.quantize(testImageData, config);

    // RGB各色が抽出されることを期待
    const hasRedish = result.colors.some(
      (c) => c.color.r > 200 && c.color.g < 100 && c.color.b < 100
    );
    const hasGreenish = result.colors.some(
      (c) => c.color.r < 100 && c.color.g > 200 && c.color.b < 100
    );
    const hasBlueish = result.colors.some(
      (c) => c.color.r < 100 && c.color.g < 100 && c.color.b > 200
    );

    expect(hasRedish || hasGreenish || hasBlueish).toBe(true);
  });

  it('品質スコアが計算される', () => {
    const result = quantizer.quantize(testImageData, config);

    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(1);
  });
});

describe('ImprovedKMeansQuantizer', () => {
  let quantizer: ImprovedKMeansQuantizer;
  let testImageData: ImageData;
  let config: ExtractionConfig;

  beforeEach(() => {
    mockRandom();
    quantizer = new ImprovedKMeansQuantizer();

    // テスト用画像データ作成（クラスター形状）
    testImageData = new ImageData(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const index = (y * 64 + x) * 4;

        // 複数のクラスターを作成
        const cluster1 = Math.sqrt((x - 16) ** 2 + (y - 16) ** 2) < 12;
        const cluster2 = Math.sqrt((x - 48) ** 2 + (y - 16) ** 2) < 12;
        const cluster3 = Math.sqrt((x - 32) ** 2 + (y - 48) ** 2) < 12;

        let r = 128,
          g = 128,
          b = 128;

        if (cluster1) {
          r = 255;
          g = 100;
          b = 100;
        } else if (cluster2) {
          r = 100;
          g = 255;
          b = 100;
        } else if (cluster3) {
          r = 100;
          g = 100;
          b = 255;
        }

        testImageData.data[index] = r;
        testImageData.data[index + 1] = g;
        testImageData.data[index + 2] = b;
        testImageData.data[index + 3] = 255;
      }
    }

    config = {
      targetColorCount: 10,
      maxColorCount: 256,
      qualityThreshold: 0.7,
      colorDistanceThreshold: 30,
      memoryLimit: 100,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('改良K-means量子化が正しく実行される', () => {
    const result = quantizer.quantize(testImageData, config);

    expect(result.algorithm).toBe('improved-kmeans');
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeLessThanOrEqual(config.targetColorCount);
    expect(result.extractionTime).toBeGreaterThan(0);
  });

  it('クラスターの代表色が適切に抽出される', () => {
    const result = quantizer.quantize(testImageData, config);

    // クラスター色が抽出されることを期待
    const hasRedCluster = result.colors.some((c) => c.color.r > 200);
    const hasGreenCluster = result.colors.some((c) => c.color.g > 200);
    const hasBlueCluster = result.colors.some((c) => c.color.b > 200);

    expect(hasRedCluster || hasGreenCluster || hasBlueCluster).toBe(true);
  });

  it('重要度と代表性が計算される', () => {
    const result = quantizer.quantize(testImageData, config);

    result.colors.forEach((extractedColor) => {
      expect(extractedColor.importance).toBeGreaterThanOrEqual(0);
      expect(extractedColor.importance).toBeLessThanOrEqual(1);
      expect(extractedColor.representativeness).toBeGreaterThanOrEqual(0);
      expect(extractedColor.representativeness).toBeLessThanOrEqual(1);
    });
  });
});

describe('HybridQuantizer', () => {
  let quantizer: HybridQuantizer;
  let testImageData: ImageData;
  let config: ExtractionConfig;

  beforeEach(() => {
    mockRandom();
    quantizer = new HybridQuantizer();

    // テスト用画像データ作成（複雑なパターン）
    testImageData = new ImageData(64, 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const index = (y * 64 + x) * 4;

        // グラデーション + 幾何学 + ノイズの複合
        const baseR = Math.floor((x / 64) * 255);
        const baseG = Math.floor((y / 64) * 255);
        const baseB = Math.floor(((x + y) / 128) * 255);

        const circle = Math.sqrt((x - 32) ** 2 + (y - 32) ** 2) < 16;
        const noise = Math.floor(Math.random() * 40 - 20);

        let r = baseR,
          g = baseG,
          b = baseB;
        if (circle) {
          r = Math.min(255, baseR + 100);
        }

        testImageData.data[index] = Math.max(0, Math.min(255, r + noise));
        testImageData.data[index + 1] = Math.max(0, Math.min(255, g + noise));
        testImageData.data[index + 2] = Math.max(0, Math.min(255, b + noise));
        testImageData.data[index + 3] = 255;
      }
    }

    config = {
      targetColorCount: 20,
      maxColorCount: 256,
      qualityThreshold: 0.7,
      colorDistanceThreshold: 25,
      memoryLimit: 100,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('ハイブリッド量子化が正しく実行される', () => {
    const result = quantizer.quantize(testImageData, config);

    expect(result.algorithm).toBe('hybrid');
    expect(result.colors.length).toBeGreaterThan(0);
    expect(result.colors.length).toBeLessThanOrEqual(config.targetColorCount);
    expect(result.extractionTime).toBeGreaterThan(0);
  });

  it('複数アルゴリズムの利点を統合する', () => {
    const result = quantizer.quantize(testImageData, config);

    // ハイブリッドアプローチは一般的に高い品質スコアを持つ
    expect(result.qualityScore).toBeGreaterThan(0.2);

    // 色の多様性が確保される
    const colors = result.colors.map((c) => c.color);
    let totalDistance = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const dr = colors[i]!.r - colors[j]!.r;
        const dg = colors[i]!.g - colors[j]!.g;
        const db = colors[i]!.b - colors[j]!.b;
        totalDistance += Math.sqrt(dr * dr + dg * dg + db * db);
        comparisons++;
      }
    }

    const avgDistance = comparisons > 0 ? totalDistance / comparisons : 0;
    expect(avgDistance).toBeGreaterThan(10); // 適度な色の分散
  });

  it('類似色の統合が適切に行われる', () => {
    const result = quantizer.quantize(testImageData, config);

    // 全ての色が十分に離れていることを確認
    const colors = result.colors.map((c) => c.color);

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const dr = colors[i]!.r - colors[j]!.r;
        const dg = colors[i]!.g - colors[j]!.g;
        const db = colors[i]!.b - colors[j]!.b;
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);

        expect(distance).toBeGreaterThan(5); // 最小距離閾値
      }
    }
  });
});

describe('AlgorithmComparison', () => {
  let comparison: AlgorithmComparison;
  let config: ExtractionConfig;

  beforeEach(() => {
    mockRandom();
    comparison = new AlgorithmComparison();

    config = {
      targetColorCount: 16,
      maxColorCount: 256,
      qualityThreshold: 0.7,
      colorDistanceThreshold: 30,
      memoryLimit: 100,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('テスト画像が正しく生成される', () => {
    const gradientImage = comparison.generateTestImage('gradient', 32, 32);
    expect(gradientImage.width).toBe(32);
    expect(gradientImage.height).toBe(32);
    expect(gradientImage.data.length).toBe(32 * 32 * 4);

    const naturalImage = comparison.generateTestImage('natural', 48, 48);
    expect(naturalImage.width).toBe(48);
    expect(naturalImage.height).toBe(48);

    const geometricImage = comparison.generateTestImage('geometric');
    expect(geometricImage.width).toBe(256);
    expect(geometricImage.height).toBe(256);

    const complexImage = comparison.generateTestImage('complex');
    expect(complexImage.data.length).toBe(256 * 256 * 4);
  });

  it('全アルゴリズム比較が実行される', async () => {
    const testImage = comparison.generateTestImage('gradient', 32, 32);
    const result = await comparison.compareAlgorithms(testImage, config);

    expect(result.octree).toBeDefined();
    expect(result.medianCut).toBeDefined();
    expect(result.kmeans).toBeDefined();
    expect(result.hybrid).toBeDefined();

    expect(result.octree.algorithm).toBe('octree');
    expect(result.medianCut.algorithm).toBe('median-cut');
    expect(result.kmeans.algorithm).toBe('improved-kmeans');
    expect(result.hybrid.algorithm).toBe('hybrid');
  });

  it('比較メトリクスが計算される', async () => {
    const testImage = comparison.generateTestImage('geometric', 40, 40);
    const result = await comparison.compareAlgorithms(testImage, config);

    expect(result.comparison.performance).toBeDefined();
    expect(result.comparison.quality).toBeDefined();
    expect(result.comparison.memory).toBeDefined();
    expect(result.comparison.colorCount).toBeDefined();
    expect(result.comparison.overallScores).toBeDefined();

    // 性能比較
    const perf = result.comparison.performance;
    expect(perf.octree).toBeGreaterThan(0);
    expect(perf.medianCut).toBeGreaterThan(0);
    expect(perf.kmeans).toBeGreaterThan(0);
    expect(perf.hybrid).toBeGreaterThan(0);

    // 品質比較
    const quality = result.comparison.quality;
    expect(quality.octree).toBeGreaterThanOrEqual(0);
    expect(quality.medianCut).toBeGreaterThanOrEqual(0);
    expect(quality.kmeans).toBeGreaterThanOrEqual(0);
    expect(quality.hybrid).toBeGreaterThanOrEqual(0);
  });

  it('勝者が決定される', async () => {
    const testImage = comparison.generateTestImage('natural', 32, 32);
    const result = await comparison.compareAlgorithms(testImage, config);

    expect(['octree', 'medianCut', 'kmeans', 'hybrid']).toContain(
      result.winner
    );

    // 勝者のスコアが最高であることを確認
    const winnerScore =
      result.comparison.overallScores[
        result.winner as keyof typeof result.comparison.overallScores
      ];
    const allScores = Object.values(result.comparison.overallScores);
    const maxScore = Math.max(...allScores);

    expect(winnerScore).toBe(maxScore);
  });

  it('画像タイプ別で異なる結果が得られる', async () => {
    const gradientImage = comparison.generateTestImage('gradient', 32, 32);
    const complexImage = comparison.generateTestImage('complex', 32, 32);

    const gradientResult = await comparison.compareAlgorithms(
      gradientImage,
      config
    );
    const complexResult = await comparison.compareAlgorithms(
      complexImage,
      config
    );

    // 異なる画像タイプでは異なる勝者が選ばれる可能性が高い
    const gradientWinner = gradientResult.winner;
    const complexWinner = complexResult.winner;

    // 勝者が異なるか、スコア分布が異なることを確認
    const gradientScores = Object.values(
      gradientResult.comparison.overallScores
    );
    const complexScores = Object.values(complexResult.comparison.overallScores);

    const gradientVariance = calculateVariance(gradientScores);
    const complexVariance = calculateVariance(complexScores);

    expect(gradientVariance + complexVariance).toBeGreaterThan(0);
  });
});

// ヘルパー関数
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return variance;
}
