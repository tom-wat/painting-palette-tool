/**
 * サンプリング戦略比較検証システム
 * 均等・重要度・エッジ優先サンプリングの包括的比較分析
 */

// 基本型定義
export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSVColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface LABColor {
  l: number; // 0-100
  a: number; // -128 to +128
  b: number; // -128 to +128
}

export interface SampledPixel {
  x: number;
  y: number;
  color: RGBColor;
  importance?: number; // 重要度スコア
  edgeStrength?: number; // エッジ強度
}

export interface SamplingResult {
  samples: SampledPixel[];
  strategy: string;
  samplingTime: number;
  representativeness: number; // 代表性スコア
  diversityScore: number; // 多様性スコア
  edgeCoverage: number; // エッジカバレッジ
  spatialDistribution: number; // 空間分布均等性
}

export interface SamplingConfig {
  targetSampleCount: number; // 目標サンプル数
  maxSampleCount: number; // 最大サンプル数
  qualityThreshold: number; // 品質閾値
  spatialWeight: number; // 空間重み
  colorWeight: number; // 色重み
  edgeWeight: number; // エッジ重み
}

/**
 * 均等サンプリング（グリッドベース）
 */
export class UniformSampler {
  /**
   * グリッドベース均等サンプリング
   */
  sample(imageData: ImageData, config: SamplingConfig): SamplingResult {
    const startTime = performance.now();
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    // グリッドサイズ計算
    const totalPixels = width * height;
    const samplingRatio = Math.min(config.maxSampleCount / totalPixels, 1.0);
    const gridSize = Math.sqrt(1 / samplingRatio);

    const stepX = Math.max(
      1,
      Math.floor(width / Math.sqrt((config.targetSampleCount * width) / height))
    );
    const stepY = Math.max(
      1,
      Math.floor(
        height / Math.sqrt((config.targetSampleCount * height) / width)
      )
    );

    // グリッドサンプリング実行
    for (let y = stepY / 2; y < height; y += stepY) {
      for (let x = stepX / 2; x < width; x += stepX) {
        const pixelIndex = (Math.floor(y) * width + Math.floor(x)) * 4;

        if (pixelIndex < data.length - 3) {
          const color: RGBColor = {
            r: data[pixelIndex] || 0,
            g: data[pixelIndex + 1] || 0,
            b: data[pixelIndex + 2] || 0,
          };

          samples.push({
            x: Math.floor(x),
            y: Math.floor(y),
            color,
          });
        }
      }
    }

    const samplingTime = performance.now() - startTime;

    return {
      samples,
      strategy: 'uniform',
      samplingTime,
      representativeness: this.calculateRepresentativeness(samples, imageData),
      diversityScore: this.calculateDiversityScore(samples),
      edgeCoverage: 0, // 均等サンプリングはエッジを考慮しない
      spatialDistribution: this.calculateSpatialDistribution(
        samples,
        width,
        height
      ),
    };
  }

  /**
   * 代表性スコア計算（色分布の網羅性）
   */
  private calculateRepresentativeness(
    samples: SampledPixel[],
    imageData: ImageData
  ): number {
    const sampleColors = samples.map((s) => s.color);
    const imageColors: RGBColor[] = [];

    // 画像全体から代表色を抽出（サブサンプリング）
    const data = imageData.data;
    const step = Math.max(1, Math.floor(data.length / (4 * 1000))); // 1000色程度

    for (let i = 0; i < data.length; i += step * 4) {
      imageColors.push({
        r: data[i] || 0,
        g: data[i + 1] || 0,
        b: data[i + 2] || 0,
      });
    }

    // 色空間カバレッジ計算
    const sampleColorSet = this.createColorHistogram(sampleColors);
    const imageColorSet = this.createColorHistogram(imageColors);

    let coveredColors = 0;
    let totalColors = 0;

    for (const colorKey of imageColorSet.keys()) {
      totalColors++;
      if (sampleColorSet.has(colorKey)) {
        coveredColors++;
      }
    }

    return totalColors > 0 ? coveredColors / totalColors : 0;
  }

  /**
   * 色ヒストグラム作成（量子化）
   */
  private createColorHistogram(colors: RGBColor[]): Set<string> {
    const histogram = new Set<string>();

    for (const color of colors) {
      // 8bit → 5bit量子化（32段階）
      const quantizedR = Math.floor(color.r / 8) * 8;
      const quantizedG = Math.floor(color.g / 8) * 8;
      const quantizedB = Math.floor(color.b / 8) * 8;

      histogram.add(`${quantizedR},${quantizedG},${quantizedB}`);
    }

    return histogram;
  }

  /**
   * 色多様性スコア計算
   */
  private calculateDiversityScore(samples: SampledPixel[]): number {
    if (samples.length === 0) return 0;

    const colors = samples.map((s) => s.color);
    let totalDistance = 0;
    let comparisons = 0;

    // 全ペア間の色距離を計算
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const distance = this.calculateColorDistance(colors[i]!, colors[j]!);
        totalDistance += distance;
        comparisons++;
      }
    }

    // 平均色距離を正規化（0-1）
    const averageDistance = comparisons > 0 ? totalDistance / comparisons : 0;
    return Math.min(averageDistance / (255 * Math.sqrt(3)), 1.0);
  }

  /**
   * RGB色距離計算
   */
  private calculateColorDistance(color1: RGBColor, color2: RGBColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * 空間分布均等性計算
   */
  private calculateSpatialDistribution(
    samples: SampledPixel[],
    width: number,
    height: number
  ): number {
    if (samples.length === 0) return 0;

    // 画像を9つの領域に分割して分布を確認
    const regions = Array.from({ length: 9 }, () => 0);

    for (const sample of samples) {
      const regionX = Math.floor((sample.x / width) * 3);
      const regionY = Math.floor((sample.y / height) * 3);
      const regionIndex = regionY * 3 + regionX;

      if (regionIndex >= 0 && regionIndex < 9) {
        regions[regionIndex] = (regions[regionIndex] || 0) + 1;
      }
    }

    // 分布の均等性を計算（標準偏差ベース）
    const average = samples.length / 9;
    const variance =
      regions.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / 9;
    const coefficient = Math.sqrt(variance) / average;

    // 0に近いほど均等分布
    return Math.max(0, 1 - coefficient);
  }
}

/**
 * 重要度ベースサンプリング
 */
export class ImportanceSampler {
  /**
   * 重要度ベースサンプリング
   */
  sample(imageData: ImageData, config: SamplingConfig): SamplingResult {
    const startTime = performance.now();
    const { width, height } = imageData;

    // 重要度マップ計算
    const importanceMap = this.calculateImportanceMap(imageData);

    // 重要度に基づくサンプリング
    const samples = this.sampleByImportance(imageData, importanceMap, config);

    const samplingTime = performance.now() - startTime;

    return {
      samples,
      strategy: 'importance',
      samplingTime,
      representativeness: this.calculateRepresentativeness(samples, imageData),
      diversityScore: this.calculateDiversityScore(samples),
      edgeCoverage: this.calculateEdgeCoverage(samples, importanceMap),
      spatialDistribution: this.calculateSpatialDistribution(
        samples,
        width,
        height
      ),
    };
  }

  /**
   * 重要度マップ計算（色の特徴量ベース）
   */
  private calculateImportanceMap(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const importanceMap = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        const pixelIndex = index * 4;

        // 現在のピクセル
        const currentR = data[pixelIndex] || 0;
        const currentG = data[pixelIndex + 1] || 0;
        const currentB = data[pixelIndex + 2] || 0;

        // 周囲8ピクセルとの色差を計算
        let totalColorDiff = 0;
        let validNeighbors = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIndex = (ny * width + nx) * 4;
              const neighborR = data[neighborIndex] || 0;
              const neighborG = data[neighborIndex + 1] || 0;
              const neighborB = data[neighborIndex + 2] || 0;

              const colorDiff = Math.sqrt(
                Math.pow(currentR - neighborR, 2) +
                  Math.pow(currentG - neighborG, 2) +
                  Math.pow(currentB - neighborB, 2)
              );

              totalColorDiff += colorDiff;
              validNeighbors++;
            }
          }
        }

        // 平均色差を重要度とする
        const importance =
          validNeighbors > 0 ? totalColorDiff / validNeighbors : 0;
        importanceMap[index] = importance;
      }
    }

    // 重要度を正規化
    const maxImportance = Math.max(...importanceMap);
    if (maxImportance > 0) {
      for (let i = 0; i < importanceMap.length; i++) {
        importanceMap[i] = (importanceMap[i] || 0) / maxImportance;
      }
    }

    return importanceMap;
  }

  /**
   * 重要度に基づくサンプリング
   */
  private sampleByImportance(
    imageData: ImageData,
    importanceMap: Float32Array,
    config: SamplingConfig
  ): SampledPixel[] {
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    // 重要度の累積分布関数作成
    const pixels: { x: number; y: number; importance: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const importance = importanceMap[index] || 0;

        if (importance > 0.1) {
          // 閾値フィルタリング
          pixels.push({ x, y, importance });
        }
      }
    }

    // 重要度でソート
    pixels.sort((a, b) => b.importance - a.importance);

    // 上位の重要ピクセルをサンプリング
    const sampleCount = Math.min(config.targetSampleCount, pixels.length);

    for (let i = 0; i < sampleCount; i++) {
      const pixel = pixels[i];
      if (!pixel) continue;

      const pixelIndex = (pixel.y * width + pixel.x) * 4;

      if (pixelIndex < data.length - 3) {
        const color: RGBColor = {
          r: data[pixelIndex] || 0,
          g: data[pixelIndex + 1] || 0,
          b: data[pixelIndex + 2] || 0,
        };

        samples.push({
          x: pixel.x,
          y: pixel.y,
          color,
          importance: pixel.importance,
        });
      }
    }

    return samples;
  }

  private calculateRepresentativeness(
    samples: SampledPixel[],
    imageData: ImageData
  ): number {
    // UniformSamplerと同じ実装を使用
    const uniformSampler = new UniformSampler();
    return (uniformSampler as any).calculateRepresentativeness(
      samples,
      imageData
    );
  }

  private calculateDiversityScore(samples: SampledPixel[]): number {
    // UniformSamplerと同じ実装を使用
    const uniformSampler = new UniformSampler();
    return (uniformSampler as any).calculateDiversityScore(samples);
  }

  private calculateSpatialDistribution(
    samples: SampledPixel[],
    width: number,
    height: number
  ): number {
    // UniformSamplerと同じ実装を使用
    const uniformSampler = new UniformSampler();
    return (uniformSampler as any).calculateSpatialDistribution(
      samples,
      width,
      height
    );
  }

  /**
   * エッジカバレッジ計算
   */
  private calculateEdgeCoverage(
    samples: SampledPixel[],
    importanceMap: Float32Array
  ): number {
    if (samples.length === 0) return 0;

    let edgePixels = 0;
    let totalEdgeStrength = 0;

    for (const sample of samples) {
      const importance = sample.importance || 0;
      if (importance > 0.5) {
        // エッジと判定する閾値
        edgePixels++;
      }
      totalEdgeStrength += importance;
    }

    return samples.length > 0 ? totalEdgeStrength / samples.length : 0;
  }
}

/**
 * エッジ優先サンプリング（Sobelフィルタベース）
 */
export class EdgePrioritySampler {
  /**
   * エッジ優先サンプリング
   */
  sample(imageData: ImageData, config: SamplingConfig): SamplingResult {
    const startTime = performance.now();
    const { width, height } = imageData;

    // エッジ検出
    const edgeMap = this.detectEdges(imageData);

    // エッジ強度に基づくサンプリング
    const samples = this.sampleByEdgeStrength(imageData, edgeMap, config);

    const samplingTime = performance.now() - startTime;

    return {
      samples,
      strategy: 'edge-priority',
      samplingTime,
      representativeness: this.calculateRepresentativeness(samples, imageData),
      diversityScore: this.calculateDiversityScore(samples),
      edgeCoverage: this.calculateEdgeCoverage(samples),
      spatialDistribution: this.calculateSpatialDistribution(
        samples,
        width,
        height
      ),
    };
  }

  /**
   * Sobelフィルタによるエッジ検出
   */
  private detectEdges(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const edgeMap = new Float32Array(width * height);

    // Sobelカーネル
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0,
          gy = 0;

        // 3x3カーネル適用
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            const pixelIndex = (py * width + px) * 4;

            // グレースケール変換
            const gray =
              (data[pixelIndex] || 0) * 0.299 +
              (data[pixelIndex + 1] || 0) * 0.587 +
              (data[pixelIndex + 2] || 0) * 0.114;

            gx += gray * sobelX[ky + 1]![kx + 1]!;
            gy += gray * sobelY[ky + 1]![kx + 1]!;
          }
        }

        // エッジ強度計算
        const edgeStrength = Math.sqrt(gx * gx + gy * gy);
        edgeMap[y * width + x] = edgeStrength;
      }
    }

    // エッジ強度を正規化
    const maxEdge = Math.max(...edgeMap);
    if (maxEdge > 0) {
      for (let i = 0; i < edgeMap.length; i++) {
        edgeMap[i] = (edgeMap[i] || 0) / maxEdge;
      }
    }

    return edgeMap;
  }

  /**
   * エッジ強度に基づくサンプリング
   */
  private sampleByEdgeStrength(
    imageData: ImageData,
    edgeMap: Float32Array,
    config: SamplingConfig
  ): SampledPixel[] {
    const { width, height, data } = imageData;
    const samples: SampledPixel[] = [];

    // エッジピクセルを強度順にソート
    const edgePixels: { x: number; y: number; edgeStrength: number }[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const edgeStrength = edgeMap[y * width + x] || 0;

        if (edgeStrength > 0.1) {
          // エッジ閾値
          edgePixels.push({ x, y, edgeStrength });
        }
      }
    }

    // エッジ強度でソート
    edgePixels.sort((a, b) => b.edgeStrength - a.edgeStrength);

    // 空間的分散を考慮したサンプリング
    const minDistance =
      Math.sqrt((width * height) / config.targetSampleCount) * 0.5;

    for (const edgePixel of edgePixels) {
      if (samples.length >= config.targetSampleCount) break;

      // 既存サンプルとの距離チェック
      const tooClose = samples.some((sample) => {
        const dx = sample.x - edgePixel.x;
        const dy = sample.y - edgePixel.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      });

      if (!tooClose) {
        const pixelIndex = (edgePixel.y * width + edgePixel.x) * 4;

        if (pixelIndex < data.length - 3) {
          const color: RGBColor = {
            r: data[pixelIndex] || 0,
            g: data[pixelIndex + 1] || 0,
            b: data[pixelIndex + 2] || 0,
          };

          samples.push({
            x: edgePixel.x,
            y: edgePixel.y,
            color,
            edgeStrength: edgePixel.edgeStrength,
          });
        }
      }
    }

    return samples;
  }

  private calculateRepresentativeness(
    samples: SampledPixel[],
    imageData: ImageData
  ): number {
    const uniformSampler = new UniformSampler();
    return (uniformSampler as any).calculateRepresentativeness(
      samples,
      imageData
    );
  }

  private calculateDiversityScore(samples: SampledPixel[]): number {
    const uniformSampler = new UniformSampler();
    return (uniformSampler as any).calculateDiversityScore(samples);
  }

  private calculateSpatialDistribution(
    samples: SampledPixel[],
    width: number,
    height: number
  ): number {
    const uniformSampler = new UniformSampler();
    return (uniformSampler as any).calculateSpatialDistribution(
      samples,
      width,
      height
    );
  }

  /**
   * エッジカバレッジ計算
   */
  private calculateEdgeCoverage(samples: SampledPixel[]): number {
    if (samples.length === 0) return 0;

    let totalEdgeStrength = 0;
    for (const sample of samples) {
      totalEdgeStrength += sample.edgeStrength || 0;
    }

    return totalEdgeStrength / samples.length;
  }
}

/**
 * ハイブリッドサンプリング（複数戦略の組み合わせ）
 */
export class HybridSampler {
  private uniformSampler = new UniformSampler();
  private importanceSampler = new ImportanceSampler();
  private edgeSampler = new EdgePrioritySampler();

  /**
   * ハイブリッドサンプリング
   */
  sample(imageData: ImageData, config: SamplingConfig): SamplingResult {
    const startTime = performance.now();

    // 各戦略の割合を設定
    const uniformRatio = 0.4; // 40% 均等サンプリング
    const importanceRatio = 0.3; // 30% 重要度サンプリング
    const edgeRatio = 0.3; // 30% エッジサンプリング

    const uniformCount = Math.floor(config.targetSampleCount * uniformRatio);
    const importanceCount = Math.floor(
      config.targetSampleCount * importanceRatio
    );
    const edgeCount = config.targetSampleCount - uniformCount - importanceCount;

    // 各戦略でサンプリング
    const uniformConfig = { ...config, targetSampleCount: uniformCount };
    const importanceConfig = { ...config, targetSampleCount: importanceCount };
    const edgeConfig = { ...config, targetSampleCount: edgeCount };

    const uniformResult = this.uniformSampler.sample(imageData, uniformConfig);
    const importanceResult = this.importanceSampler.sample(
      imageData,
      importanceConfig
    );
    const edgeResult = this.edgeSampler.sample(imageData, edgeConfig);

    // 結果をマージ
    const samples = [
      ...uniformResult.samples,
      ...importanceResult.samples,
      ...edgeResult.samples,
    ];

    // 重複除去（近接ピクセル統合）
    const mergedSamples = this.removeDuplicates(
      samples,
      imageData.width,
      imageData.height
    );

    const samplingTime = performance.now() - startTime;

    return {
      samples: mergedSamples,
      strategy: 'hybrid',
      samplingTime,
      representativeness: this.calculateRepresentativeness(
        mergedSamples,
        imageData
      ),
      diversityScore: this.calculateDiversityScore(mergedSamples),
      edgeCoverage: this.calculateEdgeCoverage(mergedSamples),
      spatialDistribution: this.calculateSpatialDistribution(
        mergedSamples,
        imageData.width,
        imageData.height
      ),
    };
  }

  /**
   * 重複除去（近接ピクセル統合）
   */
  private removeDuplicates(
    samples: SampledPixel[],
    width: number,
    height: number
  ): SampledPixel[] {
    const mergedSamples: SampledPixel[] = [];
    const minDistance = Math.sqrt((width * height) / (samples.length * 2));

    for (const sample of samples) {
      const isNearExisting = mergedSamples.some((existing) => {
        const dx = existing.x - sample.x;
        const dy = existing.y - sample.y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      });

      if (!isNearExisting) {
        mergedSamples.push(sample);
      }
    }

    return mergedSamples;
  }

  private calculateRepresentativeness(
    samples: SampledPixel[],
    imageData: ImageData
  ): number {
    return (this.uniformSampler as any).calculateRepresentativeness(
      samples,
      imageData
    );
  }

  private calculateDiversityScore(samples: SampledPixel[]): number {
    return (this.uniformSampler as any).calculateDiversityScore(samples);
  }

  private calculateSpatialDistribution(
    samples: SampledPixel[],
    width: number,
    height: number
  ): number {
    return (this.uniformSampler as any).calculateSpatialDistribution(
      samples,
      width,
      height
    );
  }

  private calculateEdgeCoverage(samples: SampledPixel[]): number {
    if (samples.length === 0) return 0;

    let edgePixels = 0;
    for (const sample of samples) {
      if ((sample.edgeStrength || 0) > 0.3 || (sample.importance || 0) > 0.5) {
        edgePixels++;
      }
    }

    return edgePixels / samples.length;
  }
}

/**
 * サンプリング戦略比較エンジン
 */
export class SamplingStrategyComparison {
  private uniformSampler = new UniformSampler();
  private importanceSampler = new ImportanceSampler();
  private edgeSampler = new EdgePrioritySampler();
  private hybridSampler = new HybridSampler();

  /**
   * 全戦略比較実行
   */
  async compareStrategies(
    imageData: ImageData,
    config: SamplingConfig
  ): Promise<{
    uniform: SamplingResult;
    importance: SamplingResult;
    edge: SamplingResult;
    hybrid: SamplingResult;
    winner: string;
    comparison: ComparisonMetrics;
  }> {
    // 各戦略でサンプリング実行
    const uniform = this.uniformSampler.sample(imageData, config);
    const importance = this.importanceSampler.sample(imageData, config);
    const edge = this.edgeSampler.sample(imageData, config);
    const hybrid = this.hybridSampler.sample(imageData, config);

    // 比較分析
    const comparison = this.analyzeComparison(
      uniform,
      importance,
      edge,
      hybrid
    );
    const winner = this.determineWinner(comparison);

    return {
      uniform,
      importance,
      edge,
      hybrid,
      winner,
      comparison,
    };
  }

  /**
   * 比較分析
   */
  private analyzeComparison(
    uniform: SamplingResult,
    importance: SamplingResult,
    edge: SamplingResult,
    hybrid: SamplingResult
  ): ComparisonMetrics {
    const results = [uniform, importance, edge, hybrid];

    return {
      performanceComparison: {
        uniform: uniform.samplingTime,
        importance: importance.samplingTime,
        edge: edge.samplingTime,
        hybrid: hybrid.samplingTime,
      },
      qualityComparison: {
        representativeness: {
          uniform: uniform.representativeness,
          importance: importance.representativeness,
          edge: edge.representativeness,
          hybrid: hybrid.representativeness,
        },
        diversity: {
          uniform: uniform.diversityScore,
          importance: importance.diversityScore,
          edge: edge.diversityScore,
          hybrid: hybrid.diversityScore,
        },
        edgeCoverage: {
          uniform: uniform.edgeCoverage,
          importance: importance.edgeCoverage,
          edge: edge.edgeCoverage,
          hybrid: hybrid.edgeCoverage,
        },
        spatialDistribution: {
          uniform: uniform.spatialDistribution,
          importance: importance.spatialDistribution,
          edge: edge.spatialDistribution,
          hybrid: hybrid.spatialDistribution,
        },
      },
      overallScores: {
        uniform: this.calculateOverallScore(uniform),
        importance: this.calculateOverallScore(importance),
        edge: this.calculateOverallScore(edge),
        hybrid: this.calculateOverallScore(hybrid),
      },
    };
  }

  /**
   * 総合スコア計算
   */
  private calculateOverallScore(result: SamplingResult): number {
    // 重み付き平均スコア
    const weights = {
      representativeness: 0.3,
      diversity: 0.25,
      edgeCoverage: 0.25,
      spatialDistribution: 0.2,
    };

    return (
      result.representativeness * weights.representativeness +
      result.diversityScore * weights.diversity +
      result.edgeCoverage * weights.edgeCoverage +
      result.spatialDistribution * weights.spatialDistribution
    );
  }

  /**
   * 勝者決定
   */
  private determineWinner(comparison: ComparisonMetrics): string {
    const scores = comparison.overallScores;
    const strategies = ['uniform', 'importance', 'edge', 'hybrid'] as const;

    let bestStrategy: string = strategies[0];
    let bestScore = scores.uniform;

    for (const strategy of strategies) {
      if (scores[strategy] > bestScore) {
        bestScore = scores[strategy];
        bestStrategy = strategy;
      }
    }

    return bestStrategy;
  }

  /**
   * テスト画像生成
   */
  generateTestImage(
    type: 'gradient' | 'checkerboard' | 'natural' | 'edge-rich',
    width = 256,
    height = 256
  ): ImageData {
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    switch (type) {
      case 'gradient':
        this.generateGradientImage(data, width, height);
        break;
      case 'checkerboard':
        this.generateCheckerboardImage(data, width, height);
        break;
      case 'natural':
        this.generateNaturalImage(data, width, height);
        break;
      case 'edge-rich':
        this.generateEdgeRichImage(data, width, height);
        break;
    }

    return imageData;
  }

  private generateGradientImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = Math.floor(((x + y) / (width + height)) * 255);

        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
      }
    }
  }

  private generateCheckerboardImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const checkSize = 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const checkX = Math.floor(x / checkSize);
        const checkY = Math.floor(y / checkSize);
        const isBlack = (checkX + checkY) % 2 === 0;

        const color = isBlack ? 0 : 255;
        data[index] = color;
        data[index + 1] = color;
        data[index + 2] = color;
        data[index + 3] = 255;
      }
    }
  }

  private generateNaturalImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // 自然画像風のランダムパターン
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        // ノイズベースの自然な色分布
        const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.03);
        const noise2 = Math.sin(x * 0.02 + y * 0.04);

        const r = Math.floor(128 + noise1 * 60 + Math.random() * 40);
        const g = Math.floor(100 + noise2 * 80 + Math.random() * 40);
        const b = Math.floor(80 + noise1 * noise2 * 100 + Math.random() * 40);

        data[index] = Math.max(0, Math.min(255, r));
        data[index + 1] = Math.max(0, Math.min(255, g));
        data[index + 2] = Math.max(0, Math.min(255, b));
        data[index + 3] = 255;
      }
    }
  }

  private generateEdgeRichImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // エッジが豊富な画像
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        // 複数の幾何パターンの組み合わせ
        const circle1 =
          Math.sqrt((x - width / 3) ** 2 + (y - height / 3) ** 2) < 50;
        const circle2 =
          Math.sqrt((x - (2 * width) / 3) ** 2 + (y - (2 * height) / 3) ** 2) <
          40;
        const stripes = Math.floor(x / 16) % 2 === 0;

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
  }
}

// 比較メトリクス型定義
export interface ComparisonMetrics {
  performanceComparison: {
    uniform: number;
    importance: number;
    edge: number;
    hybrid: number;
  };
  qualityComparison: {
    representativeness: {
      uniform: number;
      importance: number;
      edge: number;
      hybrid: number;
    };
    diversity: {
      uniform: number;
      importance: number;
      edge: number;
      hybrid: number;
    };
    edgeCoverage: {
      uniform: number;
      importance: number;
      edge: number;
      hybrid: number;
    };
    spatialDistribution: {
      uniform: number;
      importance: number;
      edge: number;
      hybrid: number;
    };
  };
  overallScores: {
    uniform: number;
    importance: number;
    edge: number;
    hybrid: number;
  };
}
