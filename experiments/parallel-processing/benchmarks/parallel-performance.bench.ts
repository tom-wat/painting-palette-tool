import { bench, describe } from 'vitest';
import { ParallelColorExtractor } from '../src/parallel-extractor.js';
import { OptimizedKMeansExtractor } from '../../color-extraction/src/optimized-kmeans.js';
import { testDataGenerator } from '../../shared/src/test-data.js';

// テスト画像生成
function generateBenchmarkImages() {
  return {
    medium: testDataGenerator.generateTestImage({
      width: 512,
      height: 512,
      pattern: 'random',
      colorCount: 64,
    }),
    large: testDataGenerator.generateTestImage({
      width: 1024,
      height: 1024,
      pattern: 'random',
      colorCount: 128,
    }),
    xlarge: testDataGenerator.generateTestImage({
      width: 2048,
      height: 2048,
      pattern: 'random',
      colorCount: 256,
    }),
  };
}

describe('Parallel vs Sequential Performance', () => {
  const images = generateBenchmarkImages();
  const colorCount = 16;
  const config = { colorCount };

  // Sequential baseline
  Object.entries(images).forEach(([imageName, imageData]) => {
    bench(
      `Sequential K-means - ${imageName} (${colorCount} colors)`,
      async () => {
        const extractor = new OptimizedKMeansExtractor(config);
        await extractor.extract(imageData);
      }
    );
  });

  // Parallel versions with different worker counts
  const workerCounts = [2, 4, 8];

  workerCounts.forEach((workerCount) => {
    Object.entries(images).forEach(([imageName, imageData]) => {
      bench(
        `Parallel K-means (${workerCount} workers) - ${imageName}`,
        async () => {
          const extractor = new ParallelColorExtractor(config, workerCount);
          try {
            await extractor.extract(imageData, {
              type: 'grid',
              chunks: workerCount,
            });
          } finally {
            extractor.terminate();
          }
        }
      );
    });
  });
});

describe('Data Split Strategy Comparison', () => {
  const largeImage = testDataGenerator.generateTestImage({
    width: 1024,
    height: 1024,
    pattern: 'random',
    colorCount: 128,
  });

  const strategies = [
    { type: 'grid' as const, chunks: 4 },
    { type: 'stripe' as const, chunks: 4 },
    { type: 'adaptive' as const, chunks: 4 },
  ];

  strategies.forEach((strategy) => {
    bench(`${strategy.type} strategy (${strategy.chunks} chunks)`, async () => {
      const extractor = new ParallelColorExtractor({ colorCount: 16 }, 4);
      try {
        await extractor.extract(largeImage, strategy);
      } finally {
        extractor.terminate();
      }
    });
  });
});

describe('Worker Count Optimization', () => {
  const testImage = testDataGenerator.generateTestImage({
    width: 1024,
    height: 1024,
    pattern: 'random',
    colorCount: 64,
  });

  const workerCounts = [1, 2, 4, 6, 8, 12, 16];

  workerCounts.forEach((count) => {
    bench(`${count} workers`, async () => {
      const extractor = new ParallelColorExtractor({ colorCount: 16 }, count);
      try {
        await extractor.extract(testImage, { type: 'grid', chunks: count });
      } finally {
        extractor.terminate();
      }
    });
  });
});

describe('Chunk Size Impact', () => {
  const testImage = testDataGenerator.generateTestImage({
    width: 1024,
    height: 1024,
    pattern: 'random',
    colorCount: 64,
  });

  const chunkCounts = [2, 4, 8, 16, 32];

  chunkCounts.forEach((chunks) => {
    bench(`${chunks} chunks (4 workers)`, async () => {
      const extractor = new ParallelColorExtractor({ colorCount: 16 }, 4);
      try {
        await extractor.extract(testImage, { type: 'grid', chunks });
      } finally {
        extractor.terminate();
      }
    });
  });
});
