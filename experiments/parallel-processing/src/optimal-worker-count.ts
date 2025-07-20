import { ParallelColorExtractor } from './parallel-extractor.js';
import { OptimizedKMeansExtractor } from '../../color-extraction/src/optimized-kmeans.js';
import type { ExtractionConfig } from '../../color-extraction/src/types.js';

const logger = {
  info: (msg: string) => console.log(`[OptimalWorkers] ${msg}`),
};

export interface WorkerCountAnalysis {
  workerCount: number;
  averageTime: number;
  throughput: number; // 画像数/秒
  efficiency: number; // 理論値との比較
  cpuUtilization: number; // CPU使用率推定
  memoryImpact: number; // メモリ使用量推定
  recommendation: 'excellent' | 'good' | 'acceptable' | 'poor';
}

export class OptimalWorkerCountAnalyzer {
  private baselineTime: number = 0;

  async findOptimalWorkerCount(
    testImageData: ImageData,
    config: ExtractionConfig,
    maxWorkers: number = navigator.hardwareConcurrency * 2 || 16
  ): Promise<{
    optimal: WorkerCountAnalysis;
    analysis: WorkerCountAnalysis[];
    recommendations: string[];
  }> {
    logger.info(`Analyzing optimal worker count (1-${maxWorkers} workers)`);

    // ベースライン測定（シングルスレッド）
    this.baselineTime = await this.measureSequentialTime(testImageData, config);
    logger.info(`Baseline sequential time: ${this.baselineTime.toFixed(2)}ms`);

    const analysis: WorkerCountAnalysis[] = [];

    // 各ワーカー数での性能測定
    for (let workerCount = 1; workerCount <= maxWorkers; workerCount++) {
      const result = await this.analyzeWorkerCount(
        workerCount,
        testImageData,
        config
      );
      analysis.push(result);

      logger.info(
        `${workerCount} workers: ${result.averageTime.toFixed(2)}ms (efficiency: ${(result.efficiency * 100).toFixed(1)}%)`
      );
    }

    // 最適なワーカー数を決定
    const optimal = this.selectOptimalConfiguration(analysis);
    const recommendations = this.generateRecommendations(analysis, optimal);

    return { optimal, analysis, recommendations };
  }

  private async measureSequentialTime(
    imageData: ImageData,
    config: ExtractionConfig
  ): Promise<number> {
    const extractor = new OptimizedKMeansExtractor(config);
    const runs = 3;
    let totalTime = 0;

    for (let i = 0; i < runs; i++) {
      const startTime = performance.now();
      await extractor.extract(imageData);
      totalTime += performance.now() - startTime;
    }

    return totalTime / runs;
  }

  private async analyzeWorkerCount(
    workerCount: number,
    imageData: ImageData,
    config: ExtractionConfig
  ): Promise<WorkerCountAnalysis> {
    const extractor = new ParallelColorExtractor(config, workerCount);
    const runs = 3;
    const times: number[] = [];

    try {
      for (let i = 0; i < runs; i++) {
        const startTime = performance.now();
        await extractor.extract(imageData, {
          type: 'grid',
          chunks: workerCount,
        });
        const duration = performance.now() - startTime;
        times.push(duration);
      }
    } finally {
      extractor.terminate();
    }

    const averageTime =
      times.reduce((sum, time) => sum + time, 0) / times.length;
    const speedup = this.baselineTime / averageTime;
    const efficiency = speedup / workerCount; // 理想的な並列化効率からの割合
    const throughput = 1000 / averageTime; // 画像数/秒

    // CPU使用率とメモリ影響の推定
    const cpuUtilization = Math.min(
      workerCount / (navigator.hardwareConcurrency || 4),
      1.5
    );
    const memoryImpact = workerCount * 0.1; // ワーカーあたり約10%のメモリ増加と仮定

    // 推奨レベルの判定
    let recommendation: WorkerCountAnalysis['recommendation'];
    if (efficiency > 0.8 && cpuUtilization <= 1.2) {
      recommendation = 'excellent';
    } else if (efficiency > 0.6 && cpuUtilization <= 1.5) {
      recommendation = 'good';
    } else if (efficiency > 0.4) {
      recommendation = 'acceptable';
    } else {
      recommendation = 'poor';
    }

    return {
      workerCount,
      averageTime,
      throughput,
      efficiency,
      cpuUtilization,
      memoryImpact,
      recommendation,
    };
  }

  private selectOptimalConfiguration(
    analysis: WorkerCountAnalysis[]
  ): WorkerCountAnalysis {
    // 効率性、スループット、リソース使用量を総合的に評価
    const scores = analysis.map((config) => {
      const efficiencyScore = config.efficiency * 40;
      const throughputScore =
        Math.min(
          config.throughput / Math.max(...analysis.map((a) => a.throughput)),
          1
        ) * 30;
      const resourceScore = Math.max(
        0,
        30 - config.cpuUtilization * 15 - config.memoryImpact * 10
      );

      return {
        ...config,
        totalScore: efficiencyScore + throughputScore + resourceScore,
      };
    });

    return scores.reduce((best, current) =>
      current.totalScore > best.totalScore ? current : best
    );
  }

  private generateRecommendations(
    analysis: WorkerCountAnalysis[],
    optimal: WorkerCountAnalysis
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(
      `Optimal worker count: ${optimal.workerCount} workers`
    );
    recommendations.push(
      `Expected performance: ${(optimal.efficiency * 100).toFixed(1)}% efficiency, ${optimal.throughput.toFixed(1)} images/sec`
    );

    // ハードウェア特性に基づく推奨
    const coreCount = navigator.hardwareConcurrency || 4;
    if (optimal.workerCount <= coreCount) {
      recommendations.push(
        'Configuration matches CPU core count - excellent for CPU-bound tasks'
      );
    } else if (optimal.workerCount <= coreCount * 1.5) {
      recommendations.push(
        'Slight oversubscription may benefit I/O-bound operations'
      );
    } else {
      recommendations.push(
        'High worker count - ensure sufficient memory and consider task complexity'
      );
    }

    // 効率性分析
    const efficiencyTrend = this.analyzeEfficiencyTrend(analysis);
    if (efficiencyTrend === 'declining') {
      recommendations.push(
        'Efficiency declines with more workers - consider task granularity optimization'
      );
    } else if (efficiencyTrend === 'plateau') {
      recommendations.push(
        'Efficiency plateaus - current configuration near optimal'
      );
    }

    // リソース使用量の警告
    if (optimal.memoryImpact > 0.5) {
      recommendations.push(
        'High memory usage detected - monitor memory consumption in production'
      );
    }

    if (optimal.cpuUtilization > 1.3) {
      recommendations.push(
        'High CPU utilization - consider reducing worker count on lower-end devices'
      );
    }

    // 具体的な実装推奨
    recommendations.push(
      'Implement adaptive worker count based on device capabilities'
    );
    recommendations.push(
      'Consider user preference settings for performance vs battery trade-off'
    );

    return recommendations;
  }

  private analyzeEfficiencyTrend(
    analysis: WorkerCountAnalysis[]
  ): 'improving' | 'plateau' | 'declining' {
    if (analysis.length < 3) return 'plateau';

    const efficiencies = analysis.map((a) => a.efficiency);
    const lastThird = efficiencies.slice(-Math.ceil(efficiencies.length / 3));
    const firstThird = efficiencies.slice(
      0,
      Math.ceil(efficiencies.length / 3)
    );

    const avgLast =
      lastThird.reduce((sum, eff) => sum + eff, 0) / lastThird.length;
    const avgFirst =
      firstThird.reduce((sum, eff) => sum + eff, 0) / firstThird.length;

    if (avgLast > avgFirst * 1.1) return 'improving';
    if (avgLast < avgFirst * 0.9) return 'declining';
    return 'plateau';
  }

  generateWorkerAnalysisReport(result: {
    optimal: WorkerCountAnalysis;
    analysis: WorkerCountAnalysis[];
    recommendations: string[];
  }): string {
    const { optimal, analysis, recommendations } = result;

    const report = [
      `
Optimal Worker Count Analysis Report
===================================

System Information:
- CPU Cores: ${navigator.hardwareConcurrency || 'Unknown'}
- Baseline Sequential Time: ${this.baselineTime.toFixed(2)}ms

Performance Analysis Results:
`,
    ];

    // 詳細テーブル
    report.push(
      'Workers | Time (ms) | Speedup | Efficiency | Throughput | CPU Util | Memory | Rating'
    );
    report.push(
      '--------|-----------|---------|------------|------------|----------|---------|--------'
    );

    analysis.forEach((config) => {
      const speedup = (this.baselineTime / config.averageTime).toFixed(2);
      const efficiency = (config.efficiency * 100).toFixed(1);
      const throughput = config.throughput.toFixed(1);
      const cpuUtil = (config.cpuUtilization * 100).toFixed(0);
      const memory = (config.memoryImpact * 100).toFixed(0);

      report.push(
        `${config.workerCount.toString().padStart(7)} | ` +
          `${config.averageTime.toFixed(2).padStart(9)} | ` +
          `${speedup.padStart(7)} | ` +
          `${efficiency.padStart(9)}% | ` +
          `${throughput.padStart(9)} | ` +
          `${cpuUtil.padStart(7)}% | ` +
          `${memory.padStart(6)}% | ` +
          `${config.recommendation.padStart(8)}`
      );
    });

    // 最適設定のハイライト
    report.push(`
Optimal Configuration:
- Worker Count: ${optimal.workerCount}
- Performance: ${optimal.averageTime.toFixed(2)}ms (${(this.baselineTime / optimal.averageTime).toFixed(2)}x speedup)
- Efficiency: ${(optimal.efficiency * 100).toFixed(1)}%
- Throughput: ${optimal.throughput.toFixed(1)} images/second
- Resource Impact: ${(optimal.cpuUtilization * 100).toFixed(0)}% CPU, ${(optimal.memoryImpact * 100).toFixed(0)}% memory

Recommendations:
${recommendations.map((rec) => '- ' + rec).join('\n')}

Implementation Guidelines:
- Use ${optimal.workerCount} workers as default configuration
- Implement device detection for adaptive worker count
- Monitor performance metrics in production environment
- Consider user-configurable performance settings
`);

    return report.join('\n');
  }
}
