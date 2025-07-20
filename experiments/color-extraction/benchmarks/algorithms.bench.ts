import { bench, describe } from 'vitest';
import { KMeansExtractor } from '../src/kmeans.js';
import { OctreeExtractor } from '../src/octree.js';
import { MedianCutExtractor } from '../src/median-cut.js';

// テスト用画像データ生成
function createTestImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i += 4) {
    // ランダムな色を生成（実際の画像に近い分布）
    data[i] = Math.floor(Math.random() * 256); // R
    data[i + 1] = Math.floor(Math.random() * 256); // G
    data[i + 2] = Math.floor(Math.random() * 256); // B
    data[i + 3] = 255; // A
  }

  return new ImageData(data, width, height);
}

// リアルな画像パターンを模倣
function createRealisticImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // グラデーションと色相変化を模倣
      const hue = (x / width) * 360;
      const sat = 0.7;
      const val = 0.8 - (y / height) * 0.6;

      const rgb = hsvToRgb(hue, sat, val);

      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = 255;
    }
  }

  return new ImageData(data, width, height);
}

function hsvToRgb(
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// テスト画像サイズ
const testSizes = [
  { width: 100, height: 100, name: '小画像 (100x100)' },
  { width: 512, height: 512, name: '中画像 (512x512)' },
  { width: 1024, height: 1024, name: '大画像 (1024x1024)' },
];

describe('色抽出アルゴリズム性能比較', () => {
  for (const size of testSizes) {
    const imageData = createRealisticImageData(size.width, size.height);

    describe(size.name, () => {
      bench('K-means (8色)', () => {
        const extractor = new KMeansExtractor({
          algorithm: 'kmeans',
          colorCount: 8,
          maxIterations: 50,
        });
        extractor.extract(imageData);
      });

      bench('K-means (12色)', () => {
        const extractor = new KMeansExtractor({
          algorithm: 'kmeans',
          colorCount: 12,
          maxIterations: 50,
        });
        extractor.extract(imageData);
      });

      bench('Octree (8色)', () => {
        const extractor = new OctreeExtractor(8);
        extractor.extract(imageData);
      });

      bench('Octree (12色)', () => {
        const extractor = new OctreeExtractor(12);
        extractor.extract(imageData);
      });

      bench('Median Cut (8色)', () => {
        const extractor = new MedianCutExtractor(8);
        extractor.extract(imageData);
      });

      bench('Median Cut (12色)', () => {
        const extractor = new MedianCutExtractor(12);
        extractor.extract(imageData);
      });
    });
  }
});

describe('メモリ使用量テスト', () => {
  const largeImage = createTestImageData(2048, 2048);

  bench('K-means メモリ効率', () => {
    const extractor = new KMeansExtractor({
      algorithm: 'kmeans',
      colorCount: 10,
    });
    extractor.extract(largeImage);
  });

  bench('Octree メモリ効率', () => {
    const extractor = new OctreeExtractor(10);
    extractor.extract(largeImage);
  });

  bench('Median Cut メモリ効率', () => {
    const extractor = new MedianCutExtractor(10);
    extractor.extract(largeImage);
  });
});
