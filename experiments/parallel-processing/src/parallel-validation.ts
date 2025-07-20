import { ParallelColorExtractor } from './parallel-extractor.js';
import { OptimizedKMeansExtractor } from '../../color-extraction/src/optimized-kmeans.js';
import { ColorExtractionQualityValidator } from '../../color-extraction/src/quality-validator.js';
import type {
  ColorData,
  ExtractionConfig,
} from '../../color-extraction/src/types.js';

const logger = {
  info: (msg: string) => console.log(`[ParallelValidation] ${msg}`),
  error: (msg: string, error?: any) =>
    console.error(`[ParallelValidation] ${msg}`, error),
  success: (msg: string) => console.log(`[ParallelValidation] ✅ ${msg}`),
};

export interface ParallelValidationResult {
  sequential: {
    colors: ColorData[];
    duration: number;
    quality: any;
  };
  parallel: {
    colors: ColorData[];
    duration: number;
    quality: any;
  };
  comparison: {
    speedup: number;
    qualityRetention: number;
    colorSimilarity: number;
    overallScore: number;
  };
  recommendation: string;
}

export class ParallelProcessingValidator {
  async validateParallelImplementation(
    imageData: ImageData,
    config: ExtractionConfig = { colorCount: 16 },
    workerCount: number = 4
  ): Promise<ParallelValidationResult> {
    logger.info('Starting parallel processing validation...');

    // Sequential実行
    logger.info('Running sequential extraction...');
    const sequentialStart = performance.now();
    const sequentialExtractor = new OptimizedKMeansExtractor(config);
    const sequentialColors = sequentialExtractor.extract(imageData);
    const sequentialDuration = performance.now() - sequentialStart;

    // Parallel実行
    logger.info(`Running parallel extraction with ${workerCount} workers...`);
    const parallelStart = performance.now();
    const parallelExtractor = new ParallelColorExtractor(config, workerCount);
    let parallelColors: ColorData[];

    try {
      parallelColors = await parallelExtractor.extract(imageData, {
        type: 'grid',
        chunks: workerCount,
      });
    } finally {
      parallelExtractor.terminate();
    }

    const parallelDuration = performance.now() - parallelStart;

    // 品質評価
    const sequentialQuality =
      ColorExtractionQualityValidator.calculateQualityMetrics(sequentialColors);
    const parallelQuality =
      ColorExtractionQualityValidator.calculateQualityMetrics(parallelColors);

    // 色の類似性評価
    const colorSimilarity = this.calculateColorSimilarity(
      sequentialColors,
      parallelColors
    );

    // 結果比較
    const speedup = sequentialDuration / parallelDuration;
    const qualityRetention =
      parallelQuality.overallQuality / sequentialQuality.overallQuality;
    const overallScore = this.calculateOverallScore(
      speedup,
      qualityRetention,
      colorSimilarity
    );

    const result: ParallelValidationResult = {
      sequential: {
        colors: sequentialColors,
        duration: sequentialDuration,
        quality: sequentialQuality,
      },
      parallel: {
        colors: parallelColors,
        duration: parallelDuration,
        quality: parallelQuality,
      },
      comparison: {
        speedup,
        qualityRetention,
        colorSimilarity,
        overallScore,
      },
      recommendation: this.generateRecommendation(
        speedup,
        qualityRetention,
        colorSimilarity
      ),
    };

    logger.success(
      `Validation completed: ${speedup.toFixed(2)}x speedup, ${(qualityRetention * 100).toFixed(1)}% quality retention`
    );

    return result;
  }

  private calculateColorSimilarity(
    colors1: ColorData[],
    colors2: ColorData[]
  ): number {
    // LAB色空間での平均距離を計算
    if (colors1.length === 0 || colors2.length === 0) return 0;

    let totalSimilarity = 0;
    const minLength = Math.min(colors1.length, colors2.length);

    // 各色について最も近い色との距離を計算
    for (let i = 0; i < minLength; i++) {
      const color1 = colors1[i];
      let minDistance = Infinity;

      for (const color2 of colors2) {
        const distance = this.calculateDeltaE(color1.lab, color2.lab);
        minDistance = Math.min(minDistance, distance);
      }

      // 距離を類似度に変換（0-1スケール）
      const similarity = Math.max(0, 1 - minDistance / 100);
      totalSimilarity += similarity;
    }

    return totalSimilarity / minLength;
  }

  private calculateDeltaE(
    lab1: { l: number; a: number; b: number },
    lab2: { l: number; a: number; b: number }
  ): number {
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  private calculateOverallScore(
    speedup: number,
    qualityRetention: number,
    colorSimilarity: number
  ): number {
    // 重み付き総合スコア（0-100）
    const speedupScore = Math.min(speedup / 2, 1) * 40; // 2x speedupで満点
    const qualityScore = qualityRetention * 30;
    const similarityScore = colorSimilarity * 30;

    return speedupScore + qualityScore + similarityScore;
  }

  private generateRecommendation(
    speedup: number,
    qualityRetention: number,
    colorSimilarity: number
  ): string {
    if (speedup > 1.5 && qualityRetention > 0.95 && colorSimilarity > 0.9) {
      return 'Excellent: Parallel processing provides significant benefits with minimal quality loss.';
    } else if (
      speedup > 1.2 &&
      qualityRetention > 0.9 &&
      colorSimilarity > 0.8
    ) {
      return 'Good: Parallel processing offers reasonable performance improvement with acceptable quality.';
    } else if (speedup > 1.0 && qualityRetention > 0.85) {
      return 'Acceptable: Parallel processing provides some benefits but consider optimization.';
    } else if (speedup < 1.0) {
      return 'Poor: Parallel processing is slower than sequential - avoid parallel implementation.';
    } else {
      return 'Marginal: Parallel processing benefits are minimal - evaluate complexity vs gains.';
    }
  }

  async runComprehensiveValidation(
    testImages: ImageData[],
    configs: ExtractionConfig[] = [
      { colorCount: 8 },
      { colorCount: 16 },
      { colorCount: 24 },
    ],
    workerCounts: number[] = [2, 4, 8]
  ): Promise<{
    results: ParallelValidationResult[];
    summary: {
      averageSpeedup: number;
      averageQualityRetention: number;
      averageColorSimilarity: number;
      successRate: number;
      recommendations: string[];
    };
  }> {
    logger.info(
      `Running comprehensive validation: ${testImages.length} images × ${configs.length} configs × ${workerCounts.length} worker counts`
    );

    const results: ParallelValidationResult[] = [];

    for (const image of testImages) {
      for (const config of configs) {
        for (const workerCount of workerCounts) {
          try {
            const result = await this.validateParallelImplementation(
              image,
              config,
              workerCount
            );
            results.push(result);
          } catch (error) {
            logger.error(
              `Validation failed for config ${JSON.stringify(config)} with ${workerCount} workers:`,
              error
            );
          }
        }
      }
    }

    // 統計計算
    const successfulResults = results.filter((r) => r.comparison.speedup > 0);
    const averageSpeedup =
      successfulResults.reduce((sum, r) => sum + r.comparison.speedup, 0) /
      successfulResults.length;
    const averageQualityRetention =
      successfulResults.reduce(
        (sum, r) => sum + r.comparison.qualityRetention,
        0
      ) / successfulResults.length;
    const averageColorSimilarity =
      successfulResults.reduce(
        (sum, r) => sum + r.comparison.colorSimilarity,
        0
      ) / successfulResults.length;
    const successRate = successfulResults.length / results.length;

    // 推奨事項生成
    const recommendations =
      this.generateComprehensiveRecommendations(successfulResults);

    const summary = {
      averageSpeedup,
      averageQualityRetention,
      averageColorSimilarity,
      successRate,
      recommendations,
    };

    logger.info(
      `Comprehensive validation completed: ${averageSpeedup.toFixed(2)}x average speedup, ${(successRate * 100).toFixed(1)}% success rate`
    );

    return { results, summary };
  }

  private generateComprehensiveRecommendations(
    results: ParallelValidationResult[]
  ): string[] {
    const recommendations: string[] = [];

    const avgSpeedup =
      results.reduce((sum, r) => sum + r.comparison.speedup, 0) /
      results.length;
    const avgQuality =
      results.reduce((sum, r) => sum + r.comparison.qualityRetention, 0) /
      results.length;

    // 全体的な推奨
    if (avgSpeedup > 1.5 && avgQuality > 0.9) {
      recommendations.push(
        'Parallel processing is highly recommended for this application'
      );
    } else if (avgSpeedup > 1.2) {
      recommendations.push('Parallel processing provides meaningful benefits');
    } else {
      recommendations.push(
        'Consider sequential processing or optimization before parallelization'
      );
    }

    // 具体的な推奨設定
    const bestResults = results
      .sort((a, b) => b.comparison.overallScore - a.comparison.overallScore)
      .slice(0, 3);

    if (bestResults.length > 0) {
      recommendations.push(
        `Best configuration achieved ${bestResults[0].comparison.speedup.toFixed(2)}x speedup`
      );
    }

    // 品質関連の推奨
    const qualityIssues = results.filter(
      (r) => r.comparison.qualityRetention < 0.9
    ).length;
    if (qualityIssues > results.length * 0.2) {
      recommendations.push(
        'Consider quality validation for parallel processing results'
      );
      recommendations.push(
        'Implement quality thresholds to ensure acceptable output'
      );
    }

    return recommendations;
  }

  generateValidationReport(validation: {
    results: ParallelValidationResult[];
    summary: any;
  }): string {
    const { results, summary } = validation;

    const report = [
      `
Parallel Processing Validation Report
====================================

Test Configuration:
- Total Tests: ${results.length}
- Success Rate: ${(summary.successRate * 100).toFixed(1)}%
- Average Speedup: ${summary.averageSpeedup.toFixed(2)}x
- Average Quality Retention: ${(summary.averageQualityRetention * 100).toFixed(1)}%
- Average Color Similarity: ${(summary.averageColorSimilarity * 100).toFixed(1)}%

Performance Distribution:`,
    ];

    // 性能分布の分析
    const speedupRanges = [
      { min: 0, max: 1, label: 'Slower (< 1x)' },
      { min: 1, max: 1.5, label: 'Modest (1-1.5x)' },
      { min: 1.5, max: 2, label: 'Good (1.5-2x)' },
      { min: 2, max: Infinity, label: 'Excellent (> 2x)' },
    ];

    speedupRanges.forEach((range) => {
      const count = results.filter(
        (r) =>
          r.comparison.speedup >= range.min && r.comparison.speedup < range.max
      ).length;
      const percentage = ((count / results.length) * 100).toFixed(1);
      report.push(`- ${range.label}: ${count} tests (${percentage}%)`);
    });

    // 品質分析
    report.push(`
Quality Analysis:
- High Quality (>95% retention): ${results.filter((r) => r.comparison.qualityRetention > 0.95).length} tests
- Good Quality (90-95% retention): ${results.filter((r) => r.comparison.qualityRetention > 0.9 && r.comparison.qualityRetention <= 0.95).length} tests
- Acceptable Quality (85-90% retention): ${results.filter((r) => r.comparison.qualityRetention > 0.85 && r.comparison.qualityRetention <= 0.9).length} tests
- Poor Quality (<85% retention): ${results.filter((r) => r.comparison.qualityRetention <= 0.85).length} tests

Recommendations:
${summary.recommendations.map((rec: string) => '- ' + rec).join('\n')}

Conclusion:
Parallel processing ${summary.averageSpeedup > 1.2 ? 'is recommended' : 'may not be beneficial'} for this color extraction workload.
Expected performance improvement: ${summary.averageSpeedup.toFixed(2)}x with ${(summary.averageQualityRetention * 100).toFixed(1)}% quality retention.`);

    return report.join('\n');
  }
}
