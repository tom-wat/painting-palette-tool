export interface BenchmarkResult {
  name: string;
  duration: number;
  memory?: {
    peak: number;
    start: number;
    end: number;
  };
  iterations?: number;
  throughput?: number;
}

export class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  private memoryMarks: Map<string, number> = new Map();

  start(name: string): void {
    this.marks.set(name, performance.now());
    if (typeof (performance as any).memory !== 'undefined') {
      this.memoryMarks.set(name, (performance as any).memory.usedJSHeapSize);
    }
  }

  end(name: string): BenchmarkResult {
    const startTime = this.marks.get(name);
    const startMemory = this.memoryMarks.get(name);

    if (!startTime) {
      throw new Error(`No start mark found for "${name}"`);
    }

    const duration = performance.now() - startTime;
    const result: BenchmarkResult = {
      name,
      duration,
    };

    if (
      startMemory !== undefined &&
      typeof (performance as any).memory !== 'undefined'
    ) {
      result.memory = {
        start: startMemory,
        end: (performance as any).memory.usedJSHeapSize,
        peak: (performance as any).memory.usedJSHeapSize,
      };
    }

    this.marks.delete(name);
    this.memoryMarks.delete(name);

    return result;
  }

  async trackAsync<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; benchmark: BenchmarkResult }> {
    this.start(name);
    const result = await operation();
    const benchmark = this.end(name);
    return { result, benchmark };
  }

  track<T>(
    name: string,
    operation: () => T
  ): { result: T; benchmark: BenchmarkResult } {
    this.start(name);
    const result = operation();
    const benchmark = this.end(name);
    return { result, benchmark };
  }

  static async benchmark<T>(
    name: string,
    operation: () => T | Promise<T>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const durations: number[] = [];
    let memoryPeak = 0;
    let memoryStart = 0;
    let memoryEnd = 0;

    if (typeof (performance as any).memory !== 'undefined') {
      memoryStart = (performance as any).memory.usedJSHeapSize;
    }

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const duration = performance.now() - start;
      durations.push(duration);

      if (typeof (performance as any).memory !== 'undefined') {
        memoryPeak = Math.max(
          memoryPeak,
          (performance as any).memory.usedJSHeapSize
        );
      }
    }

    if (typeof (performance as any).memory !== 'undefined') {
      memoryEnd = (performance as any).memory.usedJSHeapSize;
    }

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / iterations;

    return {
      name,
      duration: avgDuration,
      iterations,
      throughput: 1000 / avgDuration, // operations per second
      memory: memoryStart
        ? {
            start: memoryStart,
            end: memoryEnd,
            peak: memoryPeak,
          }
        : undefined,
    };
  }
}

export const perf = new PerformanceTracker();

export function formatBenchmarkResult(result: BenchmarkResult): string {
  let output = `${result.name}: ${result.duration.toFixed(3)}ms`;

  if (result.iterations) {
    output += ` (avg over ${result.iterations} iterations)`;
  }

  if (result.throughput) {
    output += `, ${result.throughput.toFixed(2)} ops/sec`;
  }

  if (result.memory) {
    const memoryUsed = (result.memory.end - result.memory.start) / 1024 / 1024;
    const memoryPeak = result.memory.peak / 1024 / 1024;
    output += `, Memory: ${memoryUsed.toFixed(2)}MB used, ${memoryPeak.toFixed(2)}MB peak`;
  }

  return output;
}
