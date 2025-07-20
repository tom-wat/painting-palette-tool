/**
 * サンプリング戦略のテスト
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockRandom, restoreRandom } from './setup.js';
import {
  UniformSampler,
  ImportanceSampler,
  EdgePrioritySampler,
  HybridSampler,
  SamplingStrategyComparison,
  type SamplingConfig,
  type SamplingResult,
} from '../src/sampling-strategies.js';

describe('UniformSampler', () => {
  let sampler: UniformSampler;
  let testImageData: ImageData;
  let config: SamplingConfig;

  beforeEach(() => {
    mockRandom();
    sampler = new UniformSampler();

    // テスト用画像データ作成
    testImageData = new ImageData(100, 100);
    for (let i = 0; i < testImageData.data.length; i += 4) {
      testImageData.data[i] = Math.floor(Math.random() * 256); // R
      testImageData.data[i + 1] = Math.floor(Math.random() * 256); // G
      testImageData.data[i + 2] = Math.floor(Math.random() * 256); // B
      testImageData.data[i + 3] = 255; // A
    }

    config = {
      targetSampleCount: 100,
      maxSampleCount: 1000,
      qualityThreshold: 0.7,
      spatialWeight: 0.3,
      colorWeight: 0.4,
      edgeWeight: 0.3,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('均等サンプリングが正しく実行される', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.strategy).toBe('uniform');
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.samples.length).toBeLessThanOrEqual(
      config.targetSampleCount * 1.2
    );
    expect(result.samplingTime).toBeGreaterThan(0);
  });

  it('サンプルの空間分布が均等である', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.spatialDistribution).toBeGreaterThan(0.5);

    // 各サンプルが有効な座標範囲内にある
    result.samples.forEach((sample) => {
      expect(sample.x).toBeGreaterThanOrEqual(0);
      expect(sample.x).toBeLessThan(testImageData.width);
      expect(sample.y).toBeGreaterThanOrEqual(0);
      expect(sample.y).toBeLessThan(testImageData.height);
    });
  });

  it('色の代表性スコアが計算される', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.representativeness).toBeGreaterThanOrEqual(0);
    expect(result.representativeness).toBeLessThanOrEqual(1);
  });

  it('多様性スコアが計算される', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.diversityScore).toBeGreaterThanOrEqual(0);
    expect(result.diversityScore).toBeLessThanOrEqual(1);
  });
});

describe('ImportanceSampler', () => {
  let sampler: ImportanceSampler;
  let testImageData: ImageData;
  let config: SamplingConfig;

  beforeEach(() => {
    mockRandom();
    sampler = new ImportanceSampler();

    // エッジのあるテスト画像作成
    testImageData = new ImageData(100, 100);
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const index = (y * 100 + x) * 4;

        // 中央に矩形を配置（エッジ作成）
        if (x > 30 && x < 70 && y > 30 && y < 70) {
          testImageData.data[index] = 255; // R
          testImageData.data[index + 1] = 255; // G
          testImageData.data[index + 2] = 255; // B
        } else {
          testImageData.data[index] = 0; // R
          testImageData.data[index + 1] = 0; // G
          testImageData.data[index + 2] = 0; // B
        }
        testImageData.data[index + 3] = 255; // A
      }
    }

    config = {
      targetSampleCount: 50,
      maxSampleCount: 500,
      qualityThreshold: 0.7,
      spatialWeight: 0.3,
      colorWeight: 0.4,
      edgeWeight: 0.3,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('重要度ベースサンプリングが実行される', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.strategy).toBe('importance');
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.samplingTime).toBeGreaterThan(0);
  });

  it('重要度の高い領域が優先的にサンプリングされる', () => {
    const result = sampler.sample(testImageData, config);

    // エッジ領域のサンプルが多いことを確認
    const edgeSamples = result.samples.filter(
      (sample) =>
        (sample.x >= 30 &&
          sample.x <= 70 &&
          (sample.y === 30 || sample.y === 70)) ||
        (sample.y >= 30 &&
          sample.y <= 70 &&
          (sample.x === 30 || sample.x === 70))
    );

    expect(edgeSamples.length).toBeGreaterThan(0);
    expect(result.edgeCoverage).toBeGreaterThan(0);
  });

  it('各サンプルに重要度が付与される', () => {
    const result = sampler.sample(testImageData, config);

    result.samples.forEach((sample) => {
      expect(sample.importance).toBeDefined();
      expect(sample.importance).toBeGreaterThanOrEqual(0);
      expect(sample.importance).toBeLessThanOrEqual(1);
    });
  });
});

describe('EdgePrioritySampler', () => {
  let sampler: EdgePrioritySampler;
  let testImageData: ImageData;
  let config: SamplingConfig;

  beforeEach(() => {
    mockRandom();
    sampler = new EdgePrioritySampler();

    // エッジリッチなテスト画像作成
    testImageData = new ImageData(100, 100);
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const index = (y * 100 + x) * 4;

        // チェッカーボードパターン（多数のエッジ）
        const checkSize = 10;
        const checkX = Math.floor(x / checkSize);
        const checkY = Math.floor(y / checkSize);
        const isWhite = (checkX + checkY) % 2 === 0;

        const color = isWhite ? 255 : 0;
        testImageData.data[index] = color;
        testImageData.data[index + 1] = color;
        testImageData.data[index + 2] = color;
        testImageData.data[index + 3] = 255;
      }
    }

    config = {
      targetSampleCount: 50,
      maxSampleCount: 500,
      qualityThreshold: 0.7,
      spatialWeight: 0.3,
      colorWeight: 0.4,
      edgeWeight: 0.3,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('エッジ優先サンプリングが実行される', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.strategy).toBe('edge-priority');
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.samplingTime).toBeGreaterThan(0);
  });

  it('エッジカバレッジが高い', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.edgeCoverage).toBeGreaterThan(0.3);

    // エッジ強度が付与されている
    result.samples.forEach((sample) => {
      expect(sample.edgeStrength).toBeDefined();
      expect(sample.edgeStrength).toBeGreaterThanOrEqual(0);
    });
  });

  it('空間的分散が考慮される', () => {
    const result = sampler.sample(testImageData, config);

    // サンプル間の最小距離をチェック
    const minDistance = Math.sqrt((100 * 100) / config.targetSampleCount) * 0.5;
    let validDistribution = true;

    for (let i = 0; i < result.samples.length && validDistribution; i++) {
      for (let j = i + 1; j < result.samples.length; j++) {
        const sample1 = result.samples[i]!;
        const sample2 = result.samples[j]!;
        const distance = Math.sqrt(
          Math.pow(sample1.x - sample2.x, 2) +
            Math.pow(sample1.y - sample2.y, 2)
        );

        if (distance < minDistance * 0.5) {
          validDistribution = false;
          break;
        }
      }
    }

    expect(validDistribution).toBe(true);
  });
});

describe('HybridSampler', () => {
  let sampler: HybridSampler;
  let testImageData: ImageData;
  let config: SamplingConfig;

  beforeEach(() => {
    mockRandom();
    sampler = new HybridSampler();

    // 複雑なテスト画像作成
    testImageData = new ImageData(100, 100);
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const index = (y * 100 + x) * 4;

        // グラデーション + エッジ
        const gradient = Math.floor(((x + y) / 200) * 255);
        const circle = Math.sqrt((x - 50) ** 2 + (y - 50) ** 2) < 20 ? 100 : 0;

        testImageData.data[index] = gradient + circle;
        testImageData.data[index + 1] = gradient;
        testImageData.data[index + 2] = Math.max(0, 255 - gradient);
        testImageData.data[index + 3] = 255;
      }
    }

    config = {
      targetSampleCount: 60,
      maxSampleCount: 600,
      qualityThreshold: 0.7,
      spatialWeight: 0.3,
      colorWeight: 0.4,
      edgeWeight: 0.3,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('ハイブリッドサンプリングが実行される', () => {
    const result = sampler.sample(testImageData, config);

    expect(result.strategy).toBe('hybrid');
    expect(result.samples.length).toBeGreaterThan(0);
    expect(result.samplingTime).toBeGreaterThan(0);
  });

  it('複数戦略の利点を組み合わせる', () => {
    const result = sampler.sample(testImageData, config);

    // 空間分布の均等性（均等サンプリング効果）
    expect(result.spatialDistribution).toBeGreaterThan(0.3);

    // エッジカバレッジ（エッジサンプリング効果）
    expect(result.edgeCoverage).toBeGreaterThan(0.01);

    // 色の代表性（重要度サンプリング効果）
    expect(result.representativeness).toBeGreaterThan(0.1);
  });

  it('重複が適切に除去される', () => {
    const result = sampler.sample(testImageData, config);

    // 同一座標のサンプルがないことを確認
    const coordinates = new Set();
    let hasDuplicates = false;

    for (const sample of result.samples) {
      const coord = `${sample.x},${sample.y}`;
      if (coordinates.has(coord)) {
        hasDuplicates = true;
        break;
      }
      coordinates.add(coord);
    }

    expect(hasDuplicates).toBe(false);
  });
});

describe('SamplingStrategyComparison', () => {
  let comparison: SamplingStrategyComparison;
  let config: SamplingConfig;

  beforeEach(() => {
    mockRandom();
    comparison = new SamplingStrategyComparison();

    config = {
      targetSampleCount: 30,
      maxSampleCount: 300,
      qualityThreshold: 0.7,
      spatialWeight: 0.3,
      colorWeight: 0.4,
      edgeWeight: 0.3,
    };
  });

  afterEach(() => {
    restoreRandom();
  });

  it('テスト画像が正しく生成される', () => {
    const gradientImage = comparison.generateTestImage('gradient', 64, 64);
    expect(gradientImage.width).toBe(64);
    expect(gradientImage.height).toBe(64);
    expect(gradientImage.data.length).toBe(64 * 64 * 4);

    const checkerImage = comparison.generateTestImage('checkerboard', 32, 32);
    expect(checkerImage.width).toBe(32);
    expect(checkerImage.height).toBe(32);

    const naturalImage = comparison.generateTestImage('natural');
    expect(naturalImage.width).toBe(256);
    expect(naturalImage.height).toBe(256);

    const edgeImage = comparison.generateTestImage('edge-rich');
    expect(edgeImage.data.length).toBe(256 * 256 * 4);
  });

  it('全戦略比較が実行される', async () => {
    const testImage = comparison.generateTestImage('gradient', 50, 50);
    const result = await comparison.compareStrategies(testImage, config);

    expect(result.uniform).toBeDefined();
    expect(result.importance).toBeDefined();
    expect(result.edge).toBeDefined();
    expect(result.hybrid).toBeDefined();

    expect(result.uniform.strategy).toBe('uniform');
    expect(result.importance.strategy).toBe('importance');
    expect(result.edge.strategy).toBe('edge-priority');
    expect(result.hybrid.strategy).toBe('hybrid');
  });

  it('比較メトリクスが計算される', async () => {
    const testImage = comparison.generateTestImage('checkerboard', 40, 40);
    const result = await comparison.compareStrategies(testImage, config);

    expect(result.comparison.performanceComparison).toBeDefined();
    expect(result.comparison.qualityComparison).toBeDefined();
    expect(result.comparison.overallScores).toBeDefined();

    // 性能比較
    const perf = result.comparison.performanceComparison;
    expect(perf.uniform).toBeGreaterThan(0);
    expect(perf.importance).toBeGreaterThan(0);
    expect(perf.edge).toBeGreaterThan(0);
    expect(perf.hybrid).toBeGreaterThan(0);

    // 品質比較
    const quality = result.comparison.qualityComparison;
    expect(quality.representativeness.uniform).toBeGreaterThanOrEqual(0);
    expect(quality.diversity.importance).toBeGreaterThanOrEqual(0);
    expect(quality.edgeCoverage.edge).toBeGreaterThanOrEqual(0);
    expect(quality.spatialDistribution.hybrid).toBeGreaterThanOrEqual(0);
  });

  it('勝者が決定される', async () => {
    const testImage = comparison.generateTestImage('natural', 60, 60);
    const result = await comparison.compareStrategies(testImage, config);

    expect(['uniform', 'importance', 'edge', 'hybrid']).toContain(
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
    const gradientImage = comparison.generateTestImage('gradient', 40, 40);
    const edgeImage = comparison.generateTestImage('edge-rich', 40, 40);

    const gradientResult = await comparison.compareStrategies(
      gradientImage,
      config
    );
    const edgeResult = await comparison.compareStrategies(edgeImage, config);

    // エッジリッチ画像ではエッジサンプリングのエッジカバレッジが高いはず
    expect(edgeResult.edge.edgeCoverage).toBeGreaterThanOrEqual(
      gradientResult.edge.edgeCoverage
    );

    // グラデーション画像では均等サンプリングの空間分布が良いはず
    expect(gradientResult.uniform.spatialDistribution).toBeGreaterThan(0.5);
  });
});
