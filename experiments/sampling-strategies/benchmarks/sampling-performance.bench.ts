/**
 * サンプリング戦略のパフォーマンスベンチマーク
 */

import { bench, describe } from 'vitest';
import {
  UniformSampler,
  ImportanceSampler,
  EdgePrioritySampler,
  HybridSampler,
  SamplingStrategyComparison,
  type SamplingConfig,
} from '../src/sampling-strategies.js';

// テストデータ生成
function createTestConfig(targetSampleCount: number): SamplingConfig {
  return {
    targetSampleCount,
    maxSampleCount: targetSampleCount * 10,
    qualityThreshold: 0.7,
    spatialWeight: 0.3,
    colorWeight: 0.4,
    edgeWeight: 0.3,
  };
}

function createTestImage(
  width: number,
  height: number,
  type: 'gradient' | 'random' | 'edges'
): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;

  switch (type) {
    case 'gradient':
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          data[index] = Math.floor((x / width) * 255); // R
          data[index + 1] = Math.floor((y / height) * 255); // G
          data[index + 2] = Math.floor(((x + y) / (width + height)) * 255); // B
          data[index + 3] = 255; // A
        }
      }
      break;

    case 'random':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor(Math.random() * 256); // R
        data[i + 1] = Math.floor(Math.random() * 256); // G
        data[i + 2] = Math.floor(Math.random() * 256); // B
        data[i + 3] = 255; // A
      }
      break;

    case 'edges':
      const checkSize = Math.max(8, Math.floor(Math.min(width, height) / 16));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const checkX = Math.floor(x / checkSize);
          const checkY = Math.floor(y / checkSize);
          const color = (checkX + checkY) % 2 === 0 ? 255 : 0;

          data[index] = color; // R
          data[index + 1] = color; // G
          data[index + 2] = color; // B
          data[index + 3] = 255; // A
        }
      }
      break;
  }

  return imageData;
}

// ベンチマーク設定
const smallConfig = createTestConfig(50);
const mediumConfig = createTestConfig(200);
const largeConfig = createTestConfig(500);

const smallImage = createTestImage(64, 64, 'gradient');
const mediumImage = createTestImage(128, 128, 'random');
const largeImage = createTestImage(256, 256, 'edges');

describe('UniformSampler 性能', () => {
  const sampler = new UniformSampler();

  bench('小画像 (64x64) - 50サンプル', () => {
    sampler.sample(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 200サンプル', () => {
    sampler.sample(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 500サンプル', () => {
    sampler.sample(largeImage, largeConfig);
  });
});

describe('ImportanceSampler 性能', () => {
  const sampler = new ImportanceSampler();

  bench('小画像 (64x64) - 50サンプル', () => {
    sampler.sample(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 200サンプル', () => {
    sampler.sample(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 500サンプル', () => {
    sampler.sample(largeImage, largeConfig);
  });
});

describe('EdgePrioritySampler 性能', () => {
  const sampler = new EdgePrioritySampler();

  bench('小画像 (64x64) - 50サンプル', () => {
    sampler.sample(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 200サンプル', () => {
    sampler.sample(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 500サンプル', () => {
    sampler.sample(largeImage, largeConfig);
  });
});

describe('HybridSampler 性能', () => {
  const sampler = new HybridSampler();

  bench('小画像 (64x64) - 50サンプル', () => {
    sampler.sample(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 200サンプル', () => {
    sampler.sample(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 500サンプル', () => {
    sampler.sample(largeImage, largeConfig);
  });
});

describe('戦略別比較 (中画像)', () => {
  const uniform = new UniformSampler();
  const importance = new ImportanceSampler();
  const edge = new EdgePrioritySampler();
  const hybrid = new HybridSampler();

  bench('Uniform - 128x128', () => {
    uniform.sample(mediumImage, mediumConfig);
  });

  bench('Importance - 128x128', () => {
    importance.sample(mediumImage, mediumConfig);
  });

  bench('Edge Priority - 128x128', () => {
    edge.sample(mediumImage, mediumConfig);
  });

  bench('Hybrid - 128x128', () => {
    hybrid.sample(mediumImage, mediumConfig);
  });
});

describe('サンプル数スケーラビリティ', () => {
  const sampler = new UniformSampler();
  const testImage = createTestImage(128, 128, 'gradient');

  bench('25サンプル', () => {
    sampler.sample(testImage, createTestConfig(25));
  });

  bench('100サンプル', () => {
    sampler.sample(testImage, createTestConfig(100));
  });

  bench('400サンプル', () => {
    sampler.sample(testImage, createTestConfig(400));
  });

  bench('1000サンプル', () => {
    sampler.sample(testImage, createTestConfig(1000));
  });
});

describe('画像サイズスケーラビリティ', () => {
  const sampler = new ImportanceSampler();
  const config = createTestConfig(200);

  bench('32x32画像', () => {
    const image = createTestImage(32, 32, 'random');
    sampler.sample(image, config);
  });

  bench('64x64画像', () => {
    const image = createTestImage(64, 64, 'random');
    sampler.sample(image, config);
  });

  bench('128x128画像', () => {
    const image = createTestImage(128, 128, 'random');
    sampler.sample(image, config);
  });

  bench('256x256画像', () => {
    const image = createTestImage(256, 256, 'random');
    sampler.sample(image, config);
  });

  bench('512x512画像', () => {
    const image = createTestImage(512, 512, 'random');
    sampler.sample(image, config);
  });
});

describe('エッジ検出性能', () => {
  const edgeSampler = new EdgePrioritySampler();

  bench('エッジ少 (グラデーション)', () => {
    const image = createTestImage(128, 128, 'gradient');
    edgeSampler.sample(image, mediumConfig);
  });

  bench('エッジ多 (チェッカーボード)', () => {
    const image = createTestImage(128, 128, 'edges');
    edgeSampler.sample(image, mediumConfig);
  });

  bench('エッジ中 (ランダム)', () => {
    const image = createTestImage(128, 128, 'random');
    edgeSampler.sample(image, mediumConfig);
  });
});

describe('包括的比較性能', () => {
  const comparison = new SamplingStrategyComparison();

  bench('小画像での全戦略比較', async () => {
    const image = createTestImage(64, 64, 'gradient');
    await comparison.compareStrategies(image, smallConfig);
  });

  bench('中画像での全戦略比較', async () => {
    const image = createTestImage(128, 128, 'random');
    await comparison.compareStrategies(image, mediumConfig);
  });
});

describe('画像タイプ別性能', () => {
  const comparison = new SamplingStrategyComparison();
  const config = createTestConfig(100);

  bench('テスト画像生成 - グラデーション', () => {
    comparison.generateTestImage('gradient', 128, 128);
  });

  bench('テスト画像生成 - チェッカーボード', () => {
    comparison.generateTestImage('checkerboard', 128, 128);
  });

  bench('テスト画像生成 - 自然画像風', () => {
    comparison.generateTestImage('natural', 128, 128);
  });

  bench('テスト画像生成 - エッジリッチ', () => {
    comparison.generateTestImage('edge-rich', 128, 128);
  });
});

describe('品質メトリクス計算性能', () => {
  const uniform = new UniformSampler();
  const testImage = createTestImage(100, 100, 'random');
  const config = createTestConfig(200);

  bench('代表性計算', () => {
    const result = uniform.sample(testImage, config);
    // 代表性計算は内部で実行される
  });

  bench('多様性計算', () => {
    const result = uniform.sample(testImage, config);
    // 多様性計算は内部で実行される
  });

  bench('空間分布計算', () => {
    const result = uniform.sample(testImage, config);
    // 空間分布計算は内部で実行される
  });
});

describe('メモリ効率性テスト', () => {
  const hybrid = new HybridSampler();

  bench('大量サンプル (2000)', () => {
    const image = createTestImage(200, 200, 'random');
    const config = createTestConfig(2000);
    hybrid.sample(image, config);
  });

  bench('大画像 (512x512)', () => {
    const image = createTestImage(512, 512, 'gradient');
    const config = createTestConfig(1000);
    hybrid.sample(image, config);
  });

  bench('極大画像 (1024x1024)', () => {
    const image = createTestImage(1024, 1024, 'edges');
    const config = createTestConfig(1500);
    hybrid.sample(image, config);
  });
});
