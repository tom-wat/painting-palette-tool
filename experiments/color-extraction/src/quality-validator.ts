import type { ColorData } from './types.js';
import { OptimizedColorConverter } from './optimized-kmeans.js';

export interface QualityMetrics {
  colorDiversity: number; // 色の多様性 (0-1)
  luminanceRange: number; // 輝度範囲 (0-1)
  temperatureBalance: number; // 暖色・寒色のバランス (0-1)
  perceptualDistance: number; // 知覚的距離の平均
  clusterCompactness: number; // クラスター内結合度
  overallQuality: number; // 総合品質スコア (0-1)
}

export interface ComparisonResult {
  original: QualityMetrics;
  optimized: QualityMetrics;
  performanceGain: number; // 高速化倍率
  qualityRetention: number; // 品質保持率 (0-1)
}

export class ColorExtractionQualityValidator {
  static calculateQualityMetrics(colors: ColorData[]): QualityMetrics {
    if (colors.length === 0) {
      return {
        colorDiversity: 0,
        luminanceRange: 0,
        temperatureBalance: 0,
        perceptualDistance: 0,
        clusterCompactness: 0,
        overallQuality: 0,
      };
    }

    const colorDiversity = this.calculateColorDiversity(colors);
    const luminanceRange = this.calculateLuminanceRange(colors);
    const temperatureBalance = this.calculateTemperatureBalance(colors);
    const perceptualDistance = this.calculatePerceptualDistance(colors);
    const clusterCompactness = this.calculateClusterCompactness(colors);

    // 総合品質スコア（重み付き平均）
    const overallQuality =
      colorDiversity * 0.25 +
      luminanceRange * 0.2 +
      temperatureBalance * 0.15 +
      perceptualDistance * 0.2 +
      clusterCompactness * 0.2;

    return {
      colorDiversity,
      luminanceRange,
      temperatureBalance,
      perceptualDistance,
      clusterCompactness,
      overallQuality,
    };
  }

  private static calculateColorDiversity(colors: ColorData[]): number {
    // 色相の分散を基に多様性を計算
    const hues: number[] = [];

    colors.forEach((color) => {
      const { r, g, b } = color.rgb;
      const hue = this.rgbToHue(r, g, b);
      if (!isNaN(hue)) hues.push(hue);
    });

    if (hues.length < 2) return 0;

    // 色相の円周上での分散を計算
    const hueVariance = this.calculateCircularVariance(hues);
    return Math.min(1, hueVariance / 0.5); // 正規化
  }

  private static calculateLuminanceRange(colors: ColorData[]): number {
    const luminances = colors.map((c) => c.luminance);
    const min = Math.min(...luminances);
    const max = Math.max(...luminances);
    return max - min; // 0-1の範囲
  }

  private static calculateTemperatureBalance(colors: ColorData[]): number {
    const warmCount = colors.filter((c) => c.temperature === 'warm').length;
    const coolCount = colors.filter((c) => c.temperature === 'cool').length;
    const neutralCount = colors.filter(
      (c) => c.temperature === 'neutral'
    ).length;

    const total = colors.length;
    if (total === 0) return 0;

    // 理想的なバランス（1:1:1）からの偏差を計算
    const idealRatio = 1 / 3;
    const warmRatio = warmCount / total;
    const coolRatio = coolCount / total;
    const neutralRatio = neutralCount / total;

    const deviation =
      Math.abs(warmRatio - idealRatio) +
      Math.abs(coolRatio - idealRatio) +
      Math.abs(neutralRatio - idealRatio);

    return Math.max(0, 1 - deviation); // 偏差が小さいほど高スコア
  }

  private static calculatePerceptualDistance(colors: ColorData[]): number {
    if (colors.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const lab1 = colors[i].lab;
        const lab2 = colors[j].lab;

        const deltaE = this.calculateDeltaE(lab1, lab2);
        totalDistance += deltaE;
        pairCount++;
      }
    }

    const averageDistance = totalDistance / pairCount;
    // 理想的な知覚距離は10-30程度
    return Math.min(1, Math.max(0, (averageDistance - 5) / 25));
  }

  private static calculateClusterCompactness(colors: ColorData[]): number {
    // 絵画用途での明度分布の適切さを評価
    const { highlights, midtones, shadows } = this.classifyByLuminance(colors);

    // 各グループのサイズバランス
    const total = colors.length;
    const highlightRatio = highlights.length / total;
    const midtoneRatio = midtones.length / total;
    const shadowRatio = shadows.length / total;

    // 理想的な分布（3:4:3）からの偏差
    const idealHighlight = 0.3;
    const idealMidtone = 0.4;
    const idealShadow = 0.3;

    const balance =
      1 -
      (Math.abs(highlightRatio - idealHighlight) +
        Math.abs(midtoneRatio - idealMidtone) +
        Math.abs(shadowRatio - idealShadow)) /
        2;

    return Math.max(0, balance);
  }

  private static rgbToHue(r: number, g: number, b: number): number {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) return NaN;

    let hue: number;
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }

    hue *= 60;
    if (hue < 0) hue += 360;

    return hue;
  }

  private static calculateCircularVariance(angles: number[]): number {
    // 角度の円周上での分散を計算
    const radians = angles.map((a) => (a * Math.PI) / 180);

    const cosSum = radians.reduce((sum, rad) => sum + Math.cos(rad), 0);
    const sinSum = radians.reduce((sum, rad) => sum + Math.sin(rad), 0);

    const n = radians.length;
    const r = Math.sqrt(cosSum * cosSum + sinSum * sinSum) / n;

    return 1 - r; // 0（集中）から1（分散）
  }

  private static calculateDeltaE(
    lab1: { l: number; a: number; b: number },
    lab2: { l: number; a: number; b: number }
  ): number {
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  private static classifyByLuminance(colors: ColorData[]) {
    const sorted = [...colors].sort((a, b) => b.luminance - a.luminance);
    const total = sorted.length;

    const highlightCount = Math.ceil(total * 0.3);
    const shadowCount = Math.ceil(total * 0.3);

    return {
      highlights: sorted.slice(0, highlightCount),
      midtones: sorted.slice(highlightCount, total - shadowCount),
      shadows: sorted.slice(total - shadowCount),
    };
  }

  // 品質比較テスト
  static async compareQuality(
    imageData: ImageData,
    originalExtractor: any,
    optimizedExtractor: any,
    config: any
  ): Promise<ComparisonResult> {
    // 性能測定
    const startOriginal = performance.now();
    const originalColors = originalExtractor.extract(imageData);
    const originalTime = performance.now() - startOriginal;

    const startOptimized = performance.now();
    const optimizedColors = optimizedExtractor.extract(imageData);
    const optimizedTime = performance.now() - startOptimized;

    // 品質評価
    const originalMetrics = this.calculateQualityMetrics(originalColors);
    const optimizedMetrics = this.calculateQualityMetrics(optimizedColors);

    const performanceGain = originalTime / optimizedTime;
    const qualityRetention =
      optimizedMetrics.overallQuality / originalMetrics.overallQuality;

    return {
      original: originalMetrics,
      optimized: optimizedMetrics,
      performanceGain,
      qualityRetention,
    };
  }

  static generateQualityReport(comparison: ComparisonResult): string {
    const { original, optimized, performanceGain, qualityRetention } =
      comparison;

    return `
Color Extraction Quality Comparison Report
==========================================

Performance:
- Speed improvement: ${performanceGain.toFixed(2)}x faster
- Quality retention: ${(qualityRetention * 100).toFixed(1)}%

Quality Metrics Comparison:
                    Original  Optimized  Change
Color Diversity:    ${original.colorDiversity.toFixed(3)}     ${optimized.colorDiversity.toFixed(3)}     ${((optimized.colorDiversity - original.colorDiversity) * 100).toFixed(1)}%
Luminance Range:    ${original.luminanceRange.toFixed(3)}     ${optimized.luminanceRange.toFixed(3)}     ${((optimized.luminanceRange - original.luminanceRange) * 100).toFixed(1)}%
Temperature Balance:${original.temperatureBalance.toFixed(3)}     ${optimized.temperatureBalance.toFixed(3)}     ${((optimized.temperatureBalance - original.temperatureBalance) * 100).toFixed(1)}%
Perceptual Distance:${original.perceptualDistance.toFixed(3)}     ${optimized.perceptualDistance.toFixed(3)}     ${((optimized.perceptualDistance - original.perceptualDistance) * 100).toFixed(1)}%
Cluster Compactness:${original.clusterCompactness.toFixed(3)}     ${optimized.clusterCompactness.toFixed(3)}     ${((optimized.clusterCompactness - original.clusterCompactness) * 100).toFixed(1)}%

Overall Quality:    ${original.overallQuality.toFixed(3)}     ${optimized.overallQuality.toFixed(3)}     ${((optimized.overallQuality - original.overallQuality) * 100).toFixed(1)}%

Recommendation: ${this.generateRecommendation(comparison)}
`;
  }

  private static generateRecommendation(comparison: ComparisonResult): string {
    const { performanceGain, qualityRetention } = comparison;

    if (performanceGain > 2 && qualityRetention > 0.95) {
      return 'Excellent optimization - significant speed improvement with minimal quality loss.';
    } else if (performanceGain > 1.5 && qualityRetention > 0.9) {
      return 'Good optimization - noticeable speed improvement with acceptable quality retention.';
    } else if (qualityRetention < 0.85) {
      return 'Quality concerns - consider adjusting optimization parameters to maintain quality.';
    } else {
      return 'Moderate improvement - optimization provides some benefits but consider further tuning.';
    }
  }
}
