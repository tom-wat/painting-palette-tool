import { bench, describe } from 'vitest';
import { KMeansExtractor } from '../src/kmeans';
import { OptimizedKMeansExtractor } from '../src/optimized-kmeans';
import { testDataGenerator } from '../../shared/src/test-data';

// テスト用の画像データを生成
function generateBenchmarkImages() {
  const generator = testDataGenerator;

  return {
    small: generator.generateTestImage({
      width: 128,
      height: 128,
      pattern: 'random',
      colorCount: 16,
    }),
    medium: generator.generateTestImage({
      width: 256,
      height: 256,
      pattern: 'gradient',
    }),
    large: generator.generateTestImage({
      width: 512,
      height: 512,
      pattern: 'random',
      colorCount: 64,
    }),
    complex: generator.generateTestImage({
      width: 256,
      height: 256,
      pattern: 'checkerboard',
    }),
  };
}

describe('K-means Performance Comparison', () => {
  const images = generateBenchmarkImages();
  const colorCounts = [8, 16, 24];

  colorCounts.forEach((colorCount) => {
    describe(`${colorCount} colors extraction`, () => {
      Object.entries(images).forEach(([imageName, imageData]) => {
        const config = { colorCount };

        bench(`Original K-means - ${imageName} (${colorCount} colors)`, () => {
          const extractor = new KMeansExtractor(config);
          extractor.extract(imageData);
        });

        bench(`Optimized K-means - ${imageName} (${colorCount} colors)`, () => {
          const extractor = new OptimizedKMeansExtractor(config);
          extractor.extract(imageData);
        });
      });
    });
  });
});

describe('Sampling Strategy Comparison', () => {
  const largeImage = testDataGenerator.generateTestImage({
    width: 1024,
    height: 1024,
    pattern: 'random',
    colorCount: 128,
  });

  bench('Original K-means - Large Image (16 colors)', () => {
    const extractor = new KMeansExtractor({ colorCount: 16 });
    extractor.extract(largeImage);
  });

  bench('Optimized K-means - Uniform Sampling (16 colors)', () => {
    const extractor = new OptimizedKMeansExtractor({ colorCount: 16 });
    extractor.extract(largeImage);
  });

  bench('Optimized K-means - Importance Sampling (24 colors)', () => {
    const extractor = new OptimizedKMeansExtractor({ colorCount: 24 });
    extractor.extract(largeImage);
  });
});

describe('Color Space Conversion Performance', () => {
  const mediumImage = testDataGenerator.generateTestImage({
    width: 512,
    height: 512,
    pattern: 'gradient',
  });

  bench('Original RGB Distance - Medium Image', () => {
    // RGB距離での簡易版K-means（比較用）
    const extractor = new KMeansExtractor({
      colorCount: 16,
      maxIterations: 50,
      convergenceThreshold: 2.0,
    });
    extractor.extract(mediumImage);
  });

  bench('Optimized LAB Distance - Medium Image', () => {
    const extractor = new OptimizedKMeansExtractor({
      colorCount: 16,
      maxIterations: 50,
      convergenceThreshold: 2.0,
    });
    extractor.extract(mediumImage);
  });
});

describe('Convergence Speed Comparison', () => {
  const testImage = testDataGenerator.generateTestImage({
    width: 256,
    height: 256,
    pattern: 'random',
    colorCount: 32,
  });

  const maxIterations = [25, 50, 100, 200];

  maxIterations.forEach((maxIter) => {
    bench(`Original K-means - ${maxIter} max iterations`, () => {
      const extractor = new KMeansExtractor({
        colorCount: 12,
        maxIterations: maxIter,
        convergenceThreshold: 1.0,
      });
      extractor.extract(testImage);
    });

    bench(`Optimized K-means - ${maxIter} max iterations`, () => {
      const extractor = new OptimizedKMeansExtractor({
        colorCount: 12,
        maxIterations: maxIter,
        convergenceThreshold: 1.0,
      });
      extractor.extract(testImage);
    });
  });
});
