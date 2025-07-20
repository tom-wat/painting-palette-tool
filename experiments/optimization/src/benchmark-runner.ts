import {
  PerformanceTracker,
  formatBenchmarkResult,
} from '../../shared/src/benchmark';
import { logger } from '../../shared/src/logger';
import {
  processRegularArray,
  processTypedArray,
  processArrayUnrolled,
  processArrayVectorized,
  processArrayCacheFriendly,
  processArrayBlocked,
} from './array-performance';

export interface OptimizationResult {
  technique: string;
  size: number;
  operation: string;
  duration: number;
  throughput: number;
  memoryUsed?: number;
  speedupFactor?: number;
}

export class OptimizationBenchmarkRunner {
  private perf = new PerformanceTracker();
  private results: OptimizationResult[] = [];

  async runComprehensiveBenchmark(): Promise<OptimizationResult[]> {
    logger.info(
      'Starting comprehensive optimization benchmark',
      undefined,
      'BENCH'
    );

    const sizes = [1000, 10000, 100000];
    const operations = ['sum', 'multiply', 'transform'] as const;

    for (const size of sizes) {
      logger.info(`Testing size: ${size}`, undefined, 'BENCH');
      const { regular, typed } = this.generateTestData(size);

      for (const operation of operations) {
        if (operation === 'transform' && size > 10000) continue; // Skip heavy operations for large sizes

        // Regular Array baseline
        const baselineResult = await this.benchmarkRegularArray(
          regular,
          operation,
          size
        );
        this.results.push(baselineResult);

        // TypedArray
        const typedResult = await this.benchmarkTypedArray(
          typed,
          operation,
          size
        );
        typedResult.speedupFactor =
          baselineResult.duration / typedResult.duration;
        this.results.push(typedResult);

        // Unrolled (only for sum/multiply)
        if (operation !== 'transform') {
          const unrolledResult = await this.benchmarkUnrolled(
            typed,
            operation,
            size
          );
          unrolledResult.speedupFactor =
            baselineResult.duration / unrolledResult.duration;
          this.results.push(unrolledResult);
        }

        // Vectorized (only for multiply)
        if (operation === 'multiply') {
          const vectorizedResult = await this.benchmarkVectorized(typed, size);
          vectorizedResult.speedupFactor =
            baselineResult.duration / vectorizedResult.duration;
          this.results.push(vectorizedResult);
        }
      }
    }

    // Memory access pattern tests
    await this.runMemoryAccessTests();

    this.logResults();
    return this.results;
  }

  private generateTestData(size: number): {
    regular: number[];
    typed: Float32Array;
  } {
    const regular: number[] = [];
    const typed = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      const value = Math.random() * 100;
      regular.push(value);
      typed[i] = value;
    }

    return { regular, typed };
  }

  private async benchmarkRegularArray(
    data: number[],
    operation: 'sum' | 'multiply' | 'transform',
    size: number
  ): Promise<OptimizationResult> {
    const { benchmark } = await this.perf.trackAsync(
      `regular-${operation}-${size}`,
      () => Promise.resolve(processRegularArray(data, operation))
    );

    return {
      technique: 'Regular Array',
      size,
      operation,
      duration: benchmark.duration,
      throughput: benchmark.throughput || 0,
      memoryUsed: benchmark.memory?.end,
    };
  }

  private async benchmarkTypedArray(
    data: Float32Array,
    operation: 'sum' | 'multiply' | 'transform',
    size: number
  ): Promise<OptimizationResult> {
    const { benchmark } = await this.perf.trackAsync(
      `typed-${operation}-${size}`,
      () => Promise.resolve(processTypedArray(data, operation))
    );

    return {
      technique: 'TypedArray',
      size,
      operation,
      duration: benchmark.duration,
      throughput: benchmark.throughput || 0,
      memoryUsed: benchmark.memory?.end,
    };
  }

  private async benchmarkUnrolled(
    data: Float32Array,
    operation: 'sum' | 'multiply',
    size: number
  ): Promise<OptimizationResult> {
    const { benchmark } = await this.perf.trackAsync(
      `unrolled-${operation}-${size}`,
      () => Promise.resolve(processArrayUnrolled(data, operation))
    );

    return {
      technique: 'Loop Unrolled',
      size,
      operation,
      duration: benchmark.duration,
      throughput: benchmark.throughput || 0,
      memoryUsed: benchmark.memory?.end,
    };
  }

  private async benchmarkVectorized(
    data: Float32Array,
    size: number
  ): Promise<OptimizationResult> {
    const { benchmark } = await this.perf.trackAsync(
      `vectorized-multiply-${size}`,
      () => Promise.resolve(processArrayVectorized(data, 'multiply'))
    );

    return {
      technique: 'Vectorized',
      size,
      operation: 'multiply',
      duration: benchmark.duration,
      throughput: benchmark.throughput || 0,
      memoryUsed: benchmark.memory?.end,
    };
  }

  private async runMemoryAccessTests(): Promise<void> {
    logger.info('Running memory access pattern tests', undefined, 'BENCH');

    const width = 512;
    const height = 512;
    const data = new Float32Array(width * height);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 100;
    }

    // Horizontal (cache-friendly)
    const horizontalResult = await this.perf.trackAsync(
      'cache-horizontal',
      () =>
        Promise.resolve(
          processArrayCacheFriendly(data, width, height, 'horizontal')
        )
    );

    this.results.push({
      technique: 'Cache Friendly (Horizontal)',
      size: data.length,
      operation: 'memory-access',
      duration: horizontalResult.benchmark.duration,
      throughput: horizontalResult.benchmark.throughput || 0,
    });

    // Vertical (cache-unfriendly)
    const verticalResult = await this.perf.trackAsync('cache-vertical', () =>
      Promise.resolve(
        processArrayCacheFriendly(data, width, height, 'vertical')
      )
    );

    const verticalResultWithSpeedup: OptimizationResult = {
      technique: 'Cache Unfriendly (Vertical)',
      size: data.length,
      operation: 'memory-access',
      duration: verticalResult.benchmark.duration,
      throughput: verticalResult.benchmark.throughput || 0,
      speedupFactor:
        verticalResult.benchmark.duration / horizontalResult.benchmark.duration, // This will be > 1 (slower)
    };

    this.results.push(verticalResultWithSpeedup);

    // Blocked processing
    const blockSizes = [32, 64, 128];
    for (const blockSize of blockSizes) {
      const blockedResult = await this.perf.trackAsync(
        `blocked-${blockSize}`,
        () =>
          Promise.resolve(processArrayBlocked(data, width, height, blockSize))
      );

      this.results.push({
        technique: `Blocked Processing (${blockSize}x${blockSize})`,
        size: data.length,
        operation: 'memory-access',
        duration: blockedResult.benchmark.duration,
        throughput: blockedResult.benchmark.throughput || 0,
        speedupFactor:
          horizontalResult.benchmark.duration /
          blockedResult.benchmark.duration,
      });
    }
  }

  private logResults(): void {
    logger.info('Optimization Benchmark Results:', undefined, 'BENCH');

    // Group by operation and size for easy comparison
    const groupedResults = this.results.reduce(
      (acc, result) => {
        const key = `${result.operation}-${result.size}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(result);
        return acc;
      },
      {} as Record<string, OptimizationResult[]>
    );

    Object.entries(groupedResults).forEach(([key, results]) => {
      logger.info(`\n=== ${key} ===`, undefined, 'BENCH');

      results
        .sort((a, b) => a.duration - b.duration) // Sort by performance (fastest first)
        .forEach((result) => {
          const speedup = result.speedupFactor
            ? ` (${result.speedupFactor.toFixed(2)}x)`
            : '';
          const throughput = result.throughput
            ? `, ${result.throughput.toFixed(0)} ops/sec`
            : '';
          logger.info(
            `${result.technique}: ${result.duration.toFixed(3)}ms${speedup}${throughput}`,
            undefined,
            'BENCH'
          );
        });
    });

    // Summary of best techniques
    logger.info('\n=== Best Techniques Summary ===', undefined, 'BENCH');
    Object.entries(groupedResults).forEach(([key, results]) => {
      const fastest = results.reduce((best, current) =>
        current.duration < best.duration ? current : best
      );
      logger.info(
        `${key}: ${fastest.technique} (${fastest.duration.toFixed(3)}ms)`,
        undefined,
        'BENCH'
      );
    });
  }

  getResults(): OptimizationResult[] {
    return [...this.results];
  }

  exportResults(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        results: this.results,
        summary: this.generateSummary(),
      },
      null,
      2
    );
  }

  private generateSummary() {
    const techniques = [...new Set(this.results.map((r) => r.technique))];
    const operations = [...new Set(this.results.map((r) => r.operation))];

    return {
      techniques,
      operations,
      totalTests: this.results.length,
      averageSpeedup:
        this.results
          .filter((r) => r.speedupFactor && r.speedupFactor > 0)
          .reduce((sum, r) => sum + (r.speedupFactor || 0), 0) /
        this.results.filter((r) => r.speedupFactor && r.speedupFactor > 0)
          .length,
    };
  }
}
