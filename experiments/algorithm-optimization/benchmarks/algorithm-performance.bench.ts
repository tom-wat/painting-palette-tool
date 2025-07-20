/**
 * アルゴリズム改良のパフォーマンスベンチマーク
 */

import { bench, describe } from 'vitest';
import {
  OctreeQuantizer,
  MedianCutQuantizer,
  ImprovedKMeansQuantizer,
  HybridQuantizer,
  AlgorithmComparison,
  type ExtractionConfig,
} from '../src/algorithm-optimization.js';

// テストデータ生成
function createTestConfig(targetColorCount: number): ExtractionConfig {
  return {
    targetColorCount,
    maxColorCount: targetColorCount * 16,
    qualityThreshold: 0.7,
    colorDistanceThreshold: 30,
    memoryLimit: 200,
  };
}

function createTestImage(
  width: number,
  height: number,
  type: 'gradient' | 'random' | 'geometric' | 'complex'
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

    case 'geometric':
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;

          const circle1 =
            Math.sqrt((x - width / 3) ** 2 + (y - height / 3) ** 2) <
            Math.min(width, height) / 8;
          const circle2 =
            Math.sqrt(
              (x - (2 * width) / 3) ** 2 + (y - (2 * height) / 3) ** 2
            ) <
            Math.min(width, height) / 10;
          const stripes = Math.floor(x / Math.max(8, width / 16)) % 2 === 0;

          let r = 128,
            g = 128,
            b = 128;

          if (circle1) {
            r = 255;
            g = 100;
            b = 100;
          } else if (circle2) {
            r = 100;
            g = 255;
            b = 100;
          } else if (stripes) {
            r = 100;
            g = 100;
            b = 255;
          }

          data[index] = r;
          data[index + 1] = g;
          data[index + 2] = b;
          data[index + 3] = 255;
        }
      }
      break;

    case 'complex':
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;

          // グラデーション + 幾何学 + ノイズ
          const baseR = Math.floor((x / width) * 255);
          const baseG = Math.floor((y / height) * 255);
          const baseB = Math.floor(((x + y) / (width + height)) * 255);

          const circle =
            Math.sqrt((x - width / 2) ** 2 + (y - height / 2) ** 2) <
            Math.min(width, height) / 6;
          const stripes =
            Math.floor((x + y) / Math.max(10, width / 12)) % 2 === 0;
          const noise = Math.random() * 50 - 25;

          let r = baseR,
            g = baseG,
            b = baseB;

          if (circle && stripes) {
            r = Math.min(255, baseR + 100);
            g = Math.min(255, baseG - 50);
          } else if (circle) {
            g = Math.min(255, baseG + 80);
          } else if (stripes) {
            b = Math.min(255, baseB + 70);
          }

          data[index] = Math.max(0, Math.min(255, r + noise));
          data[index + 1] = Math.max(0, Math.min(255, g + noise));
          data[index + 2] = Math.max(0, Math.min(255, b + noise));
          data[index + 3] = 255;
        }
      }
      break;
  }

  return imageData;
}

// ベンチマーク設定
const smallConfig = createTestConfig(8);
const mediumConfig = createTestConfig(16);
const largeConfig = createTestConfig(32);

const smallImage = createTestImage(64, 64, 'gradient');
const mediumImage = createTestImage(128, 128, 'geometric');
const largeImage = createTestImage(256, 256, 'complex');

describe('OctreeQuantizer 性能', () => {
  const quantizer = new OctreeQuantizer();

  bench('小画像 (64x64) - 8色', () => {
    quantizer.quantize(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 16色', () => {
    quantizer.quantize(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 32色', () => {
    quantizer.quantize(largeImage, largeConfig);
  });
});

describe('MedianCutQuantizer 性能', () => {
  const quantizer = new MedianCutQuantizer();

  bench('小画像 (64x64) - 8色', () => {
    quantizer.quantize(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 16色', () => {
    quantizer.quantize(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 32色', () => {
    quantizer.quantize(largeImage, largeConfig);
  });
});

describe('ImprovedKMeansQuantizer 性能', () => {
  const quantizer = new ImprovedKMeansQuantizer();

  bench('小画像 (64x64) - 8色', () => {
    quantizer.quantize(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 16色', () => {
    quantizer.quantize(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 32色', () => {
    quantizer.quantize(largeImage, largeConfig);
  });
});

describe('HybridQuantizer 性能', () => {
  const quantizer = new HybridQuantizer();

  bench('小画像 (64x64) - 8色', () => {
    quantizer.quantize(smallImage, smallConfig);
  });

  bench('中画像 (128x128) - 16色', () => {
    quantizer.quantize(mediumImage, mediumConfig);
  });

  bench('大画像 (256x256) - 32色', () => {
    quantizer.quantize(largeImage, largeConfig);
  });
});

describe('アルゴリズム別比較 (中画像)', () => {
  const octree = new OctreeQuantizer();
  const medianCut = new MedianCutQuantizer();
  const kmeans = new ImprovedKMeansQuantizer();
  const hybrid = new HybridQuantizer();

  bench('Octree - 128x128', () => {
    octree.quantize(mediumImage, mediumConfig);
  });

  bench('MedianCut - 128x128', () => {
    medianCut.quantize(mediumImage, mediumConfig);
  });

  bench('ImprovedKMeans - 128x128', () => {
    kmeans.quantize(mediumImage, mediumConfig);
  });

  bench('Hybrid - 128x128', () => {
    hybrid.quantize(mediumImage, mediumConfig);
  });
});

describe('色数スケーラビリティ', () => {
  const quantizer = new OctreeQuantizer();
  const testImage = createTestImage(128, 128, 'random');

  bench('4色抽出', () => {
    quantizer.quantize(testImage, createTestConfig(4));
  });

  bench('8色抽出', () => {
    quantizer.quantize(testImage, createTestConfig(8));
  });

  bench('16色抽出', () => {
    quantizer.quantize(testImage, createTestConfig(16));
  });

  bench('32色抽出', () => {
    quantizer.quantize(testImage, createTestConfig(32));
  });

  bench('64色抽出', () => {
    quantizer.quantize(testImage, createTestConfig(64));
  });
});

describe('画像サイズスケーラビリティ', () => {
  const quantizer = new MedianCutQuantizer();
  const config = createTestConfig(16);

  bench('32x32画像', () => {
    const image = createTestImage(32, 32, 'geometric');
    quantizer.quantize(image, config);
  });

  bench('64x64画像', () => {
    const image = createTestImage(64, 64, 'geometric');
    quantizer.quantize(image, config);
  });

  bench('128x128画像', () => {
    const image = createTestImage(128, 128, 'geometric');
    quantizer.quantize(image, config);
  });

  bench('256x256画像', () => {
    const image = createTestImage(256, 256, 'geometric');
    quantizer.quantize(image, config);
  });

  bench('512x512画像', () => {
    const image = createTestImage(512, 512, 'geometric');
    quantizer.quantize(image, config);
  });
});

describe('画像タイプ別性能', () => {
  const quantizer = new ImprovedKMeansQuantizer();
  const config = createTestConfig(16);

  bench('グラデーション画像', () => {
    const image = createTestImage(128, 128, 'gradient');
    quantizer.quantize(image, config);
  });

  bench('ランダム画像', () => {
    const image = createTestImage(128, 128, 'random');
    quantizer.quantize(image, config);
  });

  bench('幾何学画像', () => {
    const image = createTestImage(128, 128, 'geometric');
    quantizer.quantize(image, config);
  });

  bench('複雑画像', () => {
    const image = createTestImage(128, 128, 'complex');
    quantizer.quantize(image, config);
  });
});

describe('K-means収束性能', () => {
  const quantizer = new ImprovedKMeansQuantizer();

  bench('K-means 4クラスター', () => {
    const image = createTestImage(96, 96, 'geometric');
    quantizer.quantize(image, createTestConfig(4));
  });

  bench('K-means 8クラスター', () => {
    const image = createTestImage(96, 96, 'geometric');
    quantizer.quantize(image, createTestConfig(8));
  });

  bench('K-means 16クラスター', () => {
    const image = createTestImage(96, 96, 'geometric');
    quantizer.quantize(image, createTestConfig(16));
  });

  bench('K-means 32クラスター', () => {
    const image = createTestImage(96, 96, 'geometric');
    quantizer.quantize(image, createTestConfig(32));
  });
});

describe('包括的比較性能', () => {
  const comparison = new AlgorithmComparison();

  bench('小画像での全アルゴリズム比較', async () => {
    const image = createTestImage(64, 64, 'gradient');
    await comparison.compareAlgorithms(image, smallConfig);
  });

  bench('中画像での全アルゴリズム比較', async () => {
    const image = createTestImage(128, 128, 'geometric');
    await comparison.compareAlgorithms(image, mediumConfig);
  });

  bench('大画像での全アルゴリズム比較', async () => {
    const image = createTestImage(192, 192, 'complex');
    await comparison.compareAlgorithms(image, largeConfig);
  });
});

describe('テスト画像生成性能', () => {
  const comparison = new AlgorithmComparison();

  bench('テスト画像生成 - グラデーション', () => {
    comparison.generateTestImage('gradient', 128, 128);
  });

  bench('テスト画像生成 - 自然画像風', () => {
    comparison.generateTestImage('natural', 128, 128);
  });

  bench('テスト画像生成 - 幾何学', () => {
    comparison.generateTestImage('geometric', 128, 128);
  });

  bench('テスト画像生成 - 複雑', () => {
    comparison.generateTestImage('complex', 128, 128);
  });
});

describe('メモリ効率性テスト', () => {
  const hybrid = new HybridQuantizer();

  bench('高解像度画像 (384x384)', () => {
    const image = createTestImage(384, 384, 'complex');
    const config = createTestConfig(24);
    hybrid.quantize(image, config);
  });

  bench('多色抽出 (64色)', () => {
    const image = createTestImage(256, 256, 'random');
    const config = createTestConfig(64);
    hybrid.quantize(image, config);
  });

  bench('超多色抽出 (128色)', () => {
    const image = createTestImage(192, 192, 'complex');
    const config = createTestConfig(128);
    hybrid.quantize(image, config);
  });
});

describe('Octree深度別性能', () => {
  const octree = new OctreeQuantizer();
  const testImage = createTestImage(128, 128, 'random');

  bench('Octree 少色数 (4色)', () => {
    octree.quantize(testImage, createTestConfig(4));
  });

  bench('Octree 中色数 (16色)', () => {
    octree.quantize(testImage, createTestConfig(16));
  });

  bench('Octree 多色数 (64色)', () => {
    octree.quantize(testImage, createTestConfig(64));
  });

  bench('Octree 最大色数 (256色)', () => {
    octree.quantize(testImage, createTestConfig(256));
  });
});

describe('MedianCut分割性能', () => {
  const medianCut = new MedianCutQuantizer();

  bench('MedianCut 単純画像', () => {
    const image = createTestImage(128, 128, 'gradient');
    medianCut.quantize(image, createTestConfig(16));
  });

  bench('MedianCut 複雑画像', () => {
    const image = createTestImage(128, 128, 'random');
    medianCut.quantize(image, createTestConfig(16));
  });

  bench('MedianCut 高分解能', () => {
    const image = createTestImage(128, 128, 'complex');
    medianCut.quantize(image, createTestConfig(32));
  });
});

describe('ハイブリッド統合性能', () => {
  const hybrid = new HybridQuantizer();

  bench('ハイブリッド バランス型', () => {
    const image = createTestImage(128, 128, 'geometric');
    const config = createTestConfig(16);
    hybrid.quantize(image, config);
  });

  bench('ハイブリッド 高品質型', () => {
    const image = createTestImage(128, 128, 'complex');
    const config = { ...createTestConfig(24), qualityThreshold: 0.9 };
    hybrid.quantize(image, config);
  });

  bench('ハイブリッド 高速型', () => {
    const image = createTestImage(128, 128, 'gradient');
    const config = { ...createTestConfig(8), qualityThreshold: 0.5 };
    hybrid.quantize(image, config);
  });
});
