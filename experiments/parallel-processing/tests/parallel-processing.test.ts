import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ParallelColorExtractor } from '../src/parallel-extractor.js';
import { OptimizedKMeansExtractor } from '../../color-extraction/src/optimized-kmeans.js';
import { ParallelProcessingValidator } from '../src/parallel-validation.js';
import { OptimalWorkerCountAnalyzer } from '../src/optimal-worker-count.js';
import { CommunicationOverheadAnalyzer } from '../src/communication-overhead.js';
import { SharedArrayBufferAnalyzer } from '../src/shared-array-buffer-test.js';
import { testDataGenerator } from '../../shared/src/test-data.js';

describe('Parallel Color Extraction', () => {
  let testImage: ImageData;

  beforeEach(() => {
    testImage = testDataGenerator.generateTestImage({
      width: 256,
      height: 256,
      pattern: 'random',
      colorCount: 32,
    });
  });

  describe('ParallelColorExtractor', () => {
    let extractor: ParallelColorExtractor;

    afterEach(() => {
      if (extractor) {
        extractor.terminate();
      }
    });

    it('should extract colors using parallel processing', async () => {
      extractor = new ParallelColorExtractor({ colorCount: 8 }, 2);

      const colors = await extractor.extract(testImage, {
        type: 'grid',
        chunks: 2,
      });

      expect(colors).toBeDefined();
      expect(colors.length).toBeLessThanOrEqual(8);
      expect(colors.length).toBeGreaterThan(0);

      // 各色がColorData形式であることを確認
      colors.forEach((color) => {
        expect(color.rgb).toBeDefined();
        expect(color.hex).toBeDefined();
        expect(color.lab).toBeDefined();
        expect(color.luminance).toBeDefined();
        expect(color.temperature).toBeDefined();
        expect(color.paintingRole).toBeDefined();
      });
    });

    it('should support different splitting strategies', async () => {
      extractor = new ParallelColorExtractor({ colorCount: 8 }, 4);

      const strategies = [
        { type: 'grid' as const, chunks: 4 },
        { type: 'stripe' as const, chunks: 4 },
        { type: 'adaptive' as const, chunks: 4 },
      ];

      for (const strategy of strategies) {
        const colors = await extractor.extract(testImage, strategy);
        expect(colors.length).toBeGreaterThan(0);
        expect(colors.length).toBeLessThanOrEqual(8);
      }
    });

    it('should handle different worker counts', async () => {
      const workerCounts = [1, 2, 4];

      for (const count of workerCounts) {
        extractor = new ParallelColorExtractor({ colorCount: 8 }, count);

        const colors = await extractor.extract(testImage, {
          type: 'grid',
          chunks: count,
        });
        expect(colors.length).toBeGreaterThan(0);

        extractor.terminate();
      }
    });

    it('should report worker pool status', () => {
      extractor = new ParallelColorExtractor({ colorCount: 8 }, 3);

      const status = extractor.getWorkerPoolStatus();
      expect(status.totalWorkers).toBe(3);
      expect(status.availableWorkers).toBe(3);
      expect(status.pendingTasks).toBe(0);
    });
  });

  describe('Parallel Processing Validation', () => {
    it('should validate parallel vs sequential results', async () => {
      const validator = new ParallelProcessingValidator();

      const result = await validator.validateParallelImplementation(
        testImage,
        { colorCount: 8 },
        2
      );

      expect(result.sequential.colors.length).toBeGreaterThan(0);
      expect(result.parallel.colors.length).toBeGreaterThan(0);
      expect(result.comparison.speedup).toBeGreaterThan(0);
      expect(result.comparison.qualityRetention).toBeGreaterThan(0);
      expect(result.comparison.colorSimilarity).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
    });

    it('should generate comprehensive validation report', async () => {
      const validator = new ParallelProcessingValidator();

      const testImages = [
        testDataGenerator.generateTestImage({
          width: 128,
          height: 128,
          pattern: 'random',
        }),
        testDataGenerator.generateTestImage({
          width: 128,
          height: 128,
          pattern: 'gradient',
        }),
      ];

      const validation = await validator.runComprehensiveValidation(
        testImages,
        [{ colorCount: 8 }],
        [2]
      );

      expect(validation.results.length).toBeGreaterThan(0);
      expect(validation.summary.averageSpeedup).toBeGreaterThan(0);
      expect(validation.summary.successRate).toBeGreaterThan(0);
      expect(validation.summary.recommendations.length).toBeGreaterThan(0);

      const report = validator.generateValidationReport(validation);
      expect(report).toContain('Parallel Processing Validation Report');
    });
  });

  describe('Optimal Worker Count Analysis', () => {
    it('should find optimal worker count', async () => {
      const analyzer = new OptimalWorkerCountAnalyzer();

      const result = await analyzer.findOptimalWorkerCount(
        testImage,
        { colorCount: 8 },
        4 // max workers
      );

      expect(result.optimal).toBeDefined();
      expect(result.analysis.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);

      expect(result.optimal.workerCount).toBeGreaterThan(0);
      expect(result.optimal.efficiency).toBeGreaterThan(0);
      expect(result.optimal.throughput).toBeGreaterThan(0);
    });

    it('should generate worker analysis report', async () => {
      const analyzer = new OptimalWorkerCountAnalyzer();

      const result = await analyzer.findOptimalWorkerCount(
        testImage,
        { colorCount: 8 },
        3
      );

      const report = analyzer.generateWorkerAnalysisReport(result);
      expect(report).toContain('Optimal Worker Count Analysis Report');
      expect(report).toContain('Performance Analysis Results');
      expect(report).toContain('Optimal Configuration');
    });
  });

  describe('Communication Overhead Analysis', () => {
    it('should measure image data transfer overhead', async () => {
      const analyzer = new CommunicationOverheadAnalyzer();

      const measurement = await analyzer.measureImageDataTransfer(testImage);

      expect(measurement.dataSize).toBeGreaterThan(0);
      expect(measurement.serializationTime).toBeGreaterThanOrEqual(0);
      expect(measurement.transferTime).toBeGreaterThanOrEqual(0);
      expect(measurement.deserializationTime).toBeGreaterThanOrEqual(0);
      expect(measurement.totalOverhead).toBeGreaterThanOrEqual(0);
    });

    it('should analyze overhead scaling', async () => {
      const analyzer = new CommunicationOverheadAnalyzer();

      const measurements = await analyzer.analyzeOverheadScaling([64, 128]);

      expect(measurements.length).toBe(2);
      measurements.forEach((measurement) => {
        expect(measurement.dataSize).toBeGreaterThan(0);
        expect(measurement.totalOverhead).toBeGreaterThanOrEqual(0);
      });

      const report = analyzer.analyzeOverheadReport(measurements);
      expect(report).toContain('Communication Overhead Analysis Report');
    });
  });

  describe('SharedArrayBuffer Analysis', () => {
    it('should test SharedArrayBuffer support', async () => {
      const analyzer = new SharedArrayBufferAnalyzer();

      const isSupported = await analyzer.testSharedArrayBufferSupport();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should measure SharedArrayBuffer performance', async () => {
      const analyzer = new SharedArrayBufferAnalyzer();

      const performance_result =
        await analyzer.measureSharedBufferPerformance(1024);

      expect(performance_result.setupTime).toBeGreaterThanOrEqual(0);
      expect(performance_result.writeTime).toBeGreaterThanOrEqual(0);
      expect(performance_result.readTime).toBeGreaterThanOrEqual(0);
      expect(performance_result.communicationTime).toBeGreaterThanOrEqual(0);
      expect(performance_result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should compare SharedArrayBuffer vs ArrayBuffer', async () => {
      const analyzer = new SharedArrayBufferAnalyzer();

      const comparison = await analyzer.compareWithRegularArrayBuffer(1024);

      expect(comparison.shared).toBeDefined();
      expect(comparison.regular).toBeDefined();
      expect(comparison.speedup).toBeGreaterThanOrEqual(0);

      const report = analyzer.generateSharedBufferReport(comparison);
      expect(report).toContain(
        'SharedArrayBuffer vs ArrayBuffer Performance Report'
      );
    });
  });
});
