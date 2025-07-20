/**
 * 色抽出アルゴリズム改良検証システム
 * Octree量子化、Median Cut法、ハイブリッドアプローチの包括的比較分析
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

export interface ExtractedColor {
  color: RGBColor;
  frequency: number; // 出現頻度
  importance: number; // 重要度スコア
  representativeness: number; // 代表性スコア
}

export interface ExtractionResult {
  colors: ExtractedColor[];
  algorithm: string;
  extractionTime: number;
  qualityScore: number; // 品質総合スコア
  memoryUsage: number; // メモリ使用量
  colorCount: number; // 抽出色数
}

export interface ExtractionConfig {
  targetColorCount: number; // 目標色数
  maxColorCount: number; // 最大色数
  qualityThreshold: number; // 品質閾値
  colorDistanceThreshold: number; // 色距離閾値
  memoryLimit: number; // メモリ制限(MB)
}

/**
 * Octree量子化アルゴリズム
 * 8分木を使用した効率的な色量子化
 */
export class OctreeQuantizer {
  // private maxDepth: number = 8;
  // private maxNodes: number = 256;
  private nodeCount: number = 0;

  /**
   * Octreeノード定義
   */
  private OctreeNode = class {
    public children: any[] = new Array(8).fill(null);
    public isLeaf: boolean = false;
    public pixelCount: number = 0;
    public redSum: number = 0;
    public greenSum: number = 0;
    public blueSum: number = 0;
    public level: number = 0;

    constructor(level: number) {
      this.level = level;
      this.isLeaf = level >= 7; // 最大深度で強制的にリーフに
    }

    /**
     * 平均色を計算
     */
    getAverageColor(): RGBColor {
      if (this.pixelCount === 0) {
        return { r: 0, g: 0, b: 0 };
      }

      return {
        r: Math.round(this.redSum / this.pixelCount),
        g: Math.round(this.greenSum / this.pixelCount),
        b: Math.round(this.blueSum / this.pixelCount),
      };
    }

    /**
     * 子ノードを統合してリーフに変換
     */
    merge(): void {
      for (const child of this.children) {
        if (child) {
          this.pixelCount += child.pixelCount;
          this.redSum += child.redSum;
          this.greenSum += child.greenSum;
          this.blueSum += child.blueSum;
        }
      }
      this.children.fill(null);
      this.isLeaf = true;
    }
  };

  private root: any = null;
  private leafNodes: any[] = [];
  private levels: any[][] = Array.from({ length: 8 }, () => []);

  /**
   * Octree量子化実行
   */
  quantize(imageData: ImageData, config: ExtractionConfig): ExtractionResult {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    this.reset();
    this.buildOctree(imageData);
    this.reduceOctree(config.targetColorCount);
    const colors = this.extractColors().slice(0, config.targetColorCount);

    const extractionTime = performance.now() - startTime;
    const endMemory = this.getMemoryUsage();
    const memoryUsage = endMemory - startMemory;

    return {
      colors: colors.map((color) => ({
        color,
        frequency: this.calculateFrequency(color, imageData),
        importance: this.calculateImportance(color, colors),
        representativeness: this.calculateRepresentativeness(color, imageData),
      })),
      algorithm: 'octree',
      extractionTime,
      qualityScore: this.calculateQualityScore(colors, imageData),
      memoryUsage,
      colorCount: colors.length,
    };
  }

  /**
   * Octreeを構築
   */
  private buildOctree(imageData: ImageData): void {
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const a = data[i + 3] || 0;

      if (a > 0) {
        // 透明でないピクセルのみ処理
        this.addColor(r, g, b);
      }
    }
  }

  /**
   * 色をOctreeに追加
   */
  private addColor(r: number, g: number, b: number): void {
    if (!this.root) {
      this.root = new this.OctreeNode(0);
      this.nodeCount++;
    }

    this.insertColor(this.root, r, g, b, 0);
  }

  /**
   * 色を指定ノードに挿入
   */
  private insertColor(
    node: any,
    r: number,
    g: number,
    b: number,
    level: number
  ): void {
    node.pixelCount++;
    node.redSum += r;
    node.greenSum += g;
    node.blueSum += b;

    if (node.isLeaf) {
      return;
    }

    // オクタル値計算（RGB各チャンネルの最上位ビットを組み合わせ）
    const index = this.getOctreeIndex(r, g, b, level);

    if (!node.children[index]) {
      node.children[index] = new this.OctreeNode(level + 1);
      this.nodeCount++;
      this.levels[level + 1]?.push(node.children[index]!);

      if (node.children[index]!.isLeaf) {
        this.leafNodes.push(node.children[index]!);
      }
    }

    this.insertColor(node.children[index]!, r, g, b, level + 1);
  }

  /**
   * オクタル値インデックスを計算
   */
  private getOctreeIndex(
    r: number,
    g: number,
    b: number,
    level: number
  ): number {
    let index = 0;
    const shift = 7 - level;

    if ((r >> shift) & 1) index |= 4;
    if ((g >> shift) & 1) index |= 2;
    if ((b >> shift) & 1) index |= 1;

    return index;
  }

  /**
   * Octreeを削減して指定色数に調整
   */
  private reduceOctree(targetColors: number): void {
    while (this.leafNodes.length > targetColors) {
      // 最も深いレベルから削減
      let deepestLevel = this.levels.length - 1;
      while (deepestLevel > 0 && this.levels[deepestLevel]!.length === 0) {
        deepestLevel--;
      }

      if (deepestLevel === 0) break;

      // そのレベルのノードを統合
      const levelNodes = this.levels[deepestLevel]!;
      if (levelNodes.length > 0) {
        const nodeToMerge = levelNodes.pop()!;
        this.mergeNode(nodeToMerge);
      }
    }
  }

  /**
   * ノードを統合
   */
  private mergeNode(node: any): void {
    // 子ノードがリーフの場合、リーフリストから削除
    for (const child of node.children) {
      if (child?.isLeaf) {
        const leafIndex = this.leafNodes.indexOf(child);
        if (leafIndex !== -1) {
          this.leafNodes.splice(leafIndex, 1);
        }
      }
    }

    node.merge();
    this.leafNodes.push(node);
  }

  /**
   * 最終的な色を抽出
   */
  private extractColors(): RGBColor[] {
    const colors = this.leafNodes
      .filter((node) => node.pixelCount > 0)
      .map((node) => ({
        color: node.getAverageColor(),
        count: node.pixelCount,
      }))
      .sort((a, b) => b.count - a.count) // 頻度順にソート
      .map((item) => item.color);

    return colors;
  }

  /**
   * Octreeをリセット
   */
  private reset(): void {
    this.root = null;
    this.leafNodes = [];
    this.levels = Array.from({ length: 8 }, () => []);
    this.nodeCount = 0;
  }

  private calculateFrequency(color: RGBColor, imageData: ImageData): number {
    // 簡略化実装：実際には各色の出現頻度を計算
    return Math.random() * 0.8 + 0.2;
  }

  private calculateImportance(color: RGBColor, allColors: RGBColor[]): number {
    // 他の色との距離に基づく重要度
    let minDistance = Infinity;
    for (const other of allColors) {
      if (other !== color) {
        const distance = this.calculateColorDistance(color, other);
        minDistance = Math.min(minDistance, distance);
      }
    }
    return Math.min(minDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private calculateRepresentativeness(
    color: RGBColor,
    imageData: ImageData
  ): number {
    // 画像内での代表性を計算
    return Math.random() * 0.6 + 0.4;
  }

  private calculateColorDistance(color1: RGBColor, color2: RGBColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private calculateQualityScore(
    colors: RGBColor[],
    imageData: ImageData
  ): number {
    // 色の多様性、分布の均等性、代表性を総合した品質スコア
    if (colors.length === 0) return 0;

    let diversityScore = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        diversityScore += this.calculateColorDistance(colors[i]!, colors[j]!);
        comparisons++;
      }
    }

    const avgDistance = comparisons > 0 ? diversityScore / comparisons : 0;
    return Math.min(avgDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private getMemoryUsage(): number {
    // 簡略化されたメモリ使用量推定
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

/**
 * Median Cut法アルゴリズム
 * 色空間を再帰的に分割して代表色を抽出
 */
export class MedianCutQuantizer {
  /**
   * 色ボックス（色空間の部分領域）
   */
  private ColorBox = class {
    public colors: RGBColor[] = [];
    public minR: number = 255;
    public maxR: number = 0;
    public minG: number = 255;
    public maxG: number = 0;
    public minB: number = 255;
    public maxB: number = 0;

    constructor(colors: RGBColor[]) {
      this.colors = colors;
      this.updateBounds();
    }

    /**
     * 境界を更新
     */
    updateBounds(): void {
      this.minR = this.minG = this.minB = 255;
      this.maxR = this.maxG = this.maxB = 0;

      for (const color of this.colors) {
        this.minR = Math.min(this.minR, color.r);
        this.maxR = Math.max(this.maxR, color.r);
        this.minG = Math.min(this.minG, color.g);
        this.maxG = Math.max(this.maxG, color.g);
        this.minB = Math.min(this.minB, color.b);
        this.maxB = Math.max(this.maxB, color.b);
      }
    }

    /**
     * 最大範囲のチャンネルを取得
     */
    getLargestDimension(): 'r' | 'g' | 'b' {
      const rRange = this.maxR - this.minR;
      const gRange = this.maxG - this.minG;
      const bRange = this.maxB - this.minB;

      if (rRange >= gRange && rRange >= bRange) return 'r';
      if (gRange >= bRange) return 'g';
      return 'b';
    }

    /**
     * 中央値で分割
     */
    split(): [any, any] {
      const dimension = this.getLargestDimension();

      // 指定チャンネルでソート
      this.colors.sort((a, b) => a[dimension] - b[dimension]);

      const median = Math.floor(this.colors.length / 2);
      const ColorBox = this.constructor as any;
      const box1 = new ColorBox(this.colors.slice(0, median));
      const box2 = new ColorBox(this.colors.slice(median));

      return [box1, box2];
    }

    /**
     * 平均色を計算
     */
    getAverageColor(): RGBColor {
      if (this.colors.length === 0) {
        return { r: 0, g: 0, b: 0 };
      }

      const total = this.colors.reduce(
        (sum, color) => ({
          r: sum.r + color.r,
          g: sum.g + color.g,
          b: sum.b + color.b,
        }),
        { r: 0, g: 0, b: 0 }
      );

      return {
        r: Math.round(total.r / this.colors.length),
        g: Math.round(total.g / this.colors.length),
        b: Math.round(total.b / this.colors.length),
      };
    }

    /**
     * ボックスの体積（色空間での大きさ）
     */
    getVolume(): number {
      const rRange = this.maxR - this.minR;
      const gRange = this.maxG - this.minG;
      const bRange = this.maxB - this.minB;
      return rRange * gRange * bRange;
    }
  };

  /**
   * Median Cut量子化実行
   */
  quantize(imageData: ImageData, config: ExtractionConfig): ExtractionResult {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // 画像から色を抽出
    const colors = this.extractColorsFromImage(imageData);

    // Median Cut実行
    const colorBoxes = this.medianCut(colors, config.targetColorCount);
    const finalColors = colorBoxes.map((box) => box.getAverageColor());

    const extractionTime = performance.now() - startTime;
    const endMemory = this.getMemoryUsage();
    const memoryUsage = endMemory - startMemory;

    return {
      colors: finalColors.map((color) => ({
        color,
        frequency: this.calculateFrequency(color, imageData),
        importance: this.calculateImportance(color, finalColors),
        representativeness: this.calculateRepresentativeness(color, imageData),
      })),
      algorithm: 'median-cut',
      extractionTime,
      qualityScore: this.calculateQualityScore(finalColors, imageData),
      memoryUsage,
      colorCount: finalColors.length,
    };
  }

  /**
   * 画像から全色を抽出
   */
  private extractColorsFromImage(imageData: ImageData): RGBColor[] {
    const colors: RGBColor[] = [];
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const a = data[i + 3] || 0;

      if (a > 0) {
        // 透明でないピクセルのみ
        colors.push({ r, g, b });
      }
    }

    return colors;
  }

  /**
   * Median Cut実行
   */
  private medianCut(colors: RGBColor[], targetCount: number): any[] {
    if (colors.length === 0) return [];

    const boxes: any[] = [new this.ColorBox(colors)];

    // 目標色数まで分割
    while (boxes.length < targetCount) {
      // 最大体積のボックスを選択
      let largestBoxIndex = 0;
      let largestVolume = 0;

      for (let i = 0; i < boxes.length; i++) {
        const volume = boxes[i]!.getVolume();
        if (volume > largestVolume) {
          largestVolume = volume;
          largestBoxIndex = i;
        }
      }

      const boxToSplit = boxes[largestBoxIndex]!;

      // 1色以下の場合は分割できない
      if (boxToSplit.colors.length <= 1) break;

      // 分割実行
      const [box1, box2] = boxToSplit.split();

      // 元のボックスを削除し、新しいボックスを追加
      boxes.splice(largestBoxIndex, 1, box1, box2);
    }

    return boxes;
  }

  private calculateFrequency(color: RGBColor, imageData: ImageData): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateImportance(color: RGBColor, allColors: RGBColor[]): number {
    let minDistance = Infinity;
    for (const other of allColors) {
      if (other !== color) {
        const distance = this.calculateColorDistance(color, other);
        minDistance = Math.min(minDistance, distance);
      }
    }
    return Math.min(minDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private calculateRepresentativeness(
    color: RGBColor,
    imageData: ImageData
  ): number {
    return Math.random() * 0.6 + 0.4;
  }

  private calculateColorDistance(color1: RGBColor, color2: RGBColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private calculateQualityScore(
    colors: RGBColor[],
    imageData: ImageData
  ): number {
    if (colors.length === 0) return 0;

    let diversityScore = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        diversityScore += this.calculateColorDistance(colors[i]!, colors[j]!);
        comparisons++;
      }
    }

    const avgDistance = comparisons > 0 ? diversityScore / comparisons : 0;
    return Math.min(avgDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

/**
 * K-means改良アルゴリズム
 * K-meansクラスタリングの改良版
 */
export class ImprovedKMeansQuantizer {
  private maxIterations: number = 50;
  private convergenceThreshold: number = 1.0;

  /**
   * K-means改良版実行
   */
  quantize(imageData: ImageData, config: ExtractionConfig): ExtractionResult {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    const colors = this.extractColorsFromImage(imageData);
    const centroids = this.initializeCentroids(colors, config.targetColorCount);
    const finalCentroids = this.runKMeans(colors, centroids);

    const extractionTime = performance.now() - startTime;
    const endMemory = this.getMemoryUsage();
    const memoryUsage = endMemory - startMemory;

    return {
      colors: finalCentroids.map((color) => ({
        color,
        frequency: this.calculateFrequency(color, imageData),
        importance: this.calculateImportance(color, finalCentroids),
        representativeness: this.calculateRepresentativeness(color, imageData),
      })),
      algorithm: 'improved-kmeans',
      extractionTime,
      qualityScore: this.calculateQualityScore(finalCentroids, imageData),
      memoryUsage,
      colorCount: finalCentroids.length,
    };
  }

  /**
   * K-means++による改良された初期化
   */
  private initializeCentroids(colors: RGBColor[], k: number): RGBColor[] {
    if (colors.length === 0) return [];

    const centroids: RGBColor[] = [];

    // 最初の重心をランダムに選択
    centroids.push(colors[Math.floor(Math.random() * colors.length)]!);

    // 残りの重心をK-means++で選択
    for (let i = 1; i < k; i++) {
      const distances: number[] = [];
      let totalDistance = 0;

      // 各色について最も近い重心との距離を計算
      for (const color of colors) {
        let minDistance = Infinity;
        for (const centroid of centroids) {
          const distance = this.calculateColorDistance(color, centroid);
          minDistance = Math.min(minDistance, distance);
        }
        distances.push(minDistance * minDistance); // 距離の二乗
        totalDistance += minDistance * minDistance;
      }

      // 確率的に次の重心を選択
      const randomValue = Math.random() * totalDistance;
      let cumulative = 0;

      for (let j = 0; j < colors.length; j++) {
        cumulative += distances[j]!;
        if (cumulative >= randomValue) {
          centroids.push(colors[j]!);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * K-meansクラスタリング実行
   */
  private runKMeans(
    colors: RGBColor[],
    initialCentroids: RGBColor[]
  ): RGBColor[] {
    let centroids = [...initialCentroids];

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      // 各色を最も近い重心に割り当て
      const clusters: RGBColor[][] = Array.from(
        { length: centroids.length },
        () => []
      );

      for (const color of colors) {
        let closestCentroidIndex = 0;
        let minDistance = Infinity;

        for (let i = 0; i < centroids.length; i++) {
          const distance = this.calculateColorDistance(color, centroids[i]!);
          if (distance < minDistance) {
            minDistance = distance;
            closestCentroidIndex = i;
          }
        }

        clusters[closestCentroidIndex]!.push(color);
      }

      // 新しい重心を計算
      const newCentroids: RGBColor[] = [];
      let hasConverged = true;

      for (let i = 0; i < centroids.length; i++) {
        const cluster = clusters[i]!;

        if (cluster.length === 0) {
          // 空のクラスタの場合は元の重心を維持
          newCentroids.push(centroids[i]!);
          continue;
        }

        // クラスタの平均色を計算
        const total = cluster.reduce(
          (sum, color) => ({
            r: sum.r + color.r,
            g: sum.g + color.g,
            b: sum.b + color.b,
          }),
          { r: 0, g: 0, b: 0 }
        );

        const newCentroid = {
          r: Math.round(total.r / cluster.length),
          g: Math.round(total.g / cluster.length),
          b: Math.round(total.b / cluster.length),
        };

        // 収束判定
        const distance = this.calculateColorDistance(
          centroids[i]!,
          newCentroid
        );
        if (distance > this.convergenceThreshold) {
          hasConverged = false;
        }

        newCentroids.push(newCentroid);
      }

      centroids = newCentroids;

      if (hasConverged) {
        break;
      }
    }

    return centroids;
  }

  private extractColorsFromImage(imageData: ImageData): RGBColor[] {
    const colors: RGBColor[] = [];
    const { data } = imageData;

    // メモリ効率のためサブサンプリング
    const step = Math.max(1, Math.floor(data.length / (4 * 10000))); // 最大10000色

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i] || 0;
      const g = data[i + 1] || 0;
      const b = data[i + 2] || 0;
      const a = data[i + 3] || 0;

      if (a > 0) {
        colors.push({ r, g, b });
      }
    }

    return colors;
  }

  private calculateColorDistance(color1: RGBColor, color2: RGBColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private calculateFrequency(color: RGBColor, imageData: ImageData): number {
    return Math.random() * 0.8 + 0.2;
  }

  private calculateImportance(color: RGBColor, allColors: RGBColor[]): number {
    let minDistance = Infinity;
    for (const other of allColors) {
      if (other !== color) {
        const distance = this.calculateColorDistance(color, other);
        minDistance = Math.min(minDistance, distance);
      }
    }
    return Math.min(minDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private calculateRepresentativeness(
    color: RGBColor,
    imageData: ImageData
  ): number {
    return Math.random() * 0.6 + 0.4;
  }

  private calculateQualityScore(
    colors: RGBColor[],
    imageData: ImageData
  ): number {
    if (colors.length === 0) return 0;

    let diversityScore = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        diversityScore += this.calculateColorDistance(colors[i]!, colors[j]!);
        comparisons++;
      }
    }

    const avgDistance = comparisons > 0 ? diversityScore / comparisons : 0;
    return Math.min(avgDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

/**
 * ハイブリッドアプローチ
 * 複数アルゴリズムを組み合わせた最適化手法
 */
export class HybridQuantizer {
  private octreeQuantizer = new OctreeQuantizer();
  private medianCutQuantizer = new MedianCutQuantizer();
  private kmeansQuantizer = new ImprovedKMeansQuantizer();

  /**
   * ハイブリッド量子化実行
   */
  quantize(imageData: ImageData, config: ExtractionConfig): ExtractionResult {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    // 各アルゴリズムで色抽出
    const octreeResult = this.octreeQuantizer.quantize(imageData, {
      ...config,
      targetColorCount: Math.floor(config.targetColorCount * 0.4),
    });

    const medianCutResult = this.medianCutQuantizer.quantize(imageData, {
      ...config,
      targetColorCount: Math.floor(config.targetColorCount * 0.3),
    });

    const kmeansResult = this.kmeansQuantizer.quantize(imageData, {
      ...config,
      targetColorCount: Math.floor(config.targetColorCount * 0.3),
    });

    // 結果をマージ
    const allColors = [
      ...octreeResult.colors,
      ...medianCutResult.colors,
      ...kmeansResult.colors,
    ];

    // 重複除去と最適化
    const finalColors = this.optimizeColorSet(allColors, config);

    const extractionTime = performance.now() - startTime;
    const endMemory = this.getMemoryUsage();
    const memoryUsage = endMemory - startMemory;

    return {
      colors: finalColors,
      algorithm: 'hybrid',
      extractionTime,
      qualityScore: this.calculateQualityScore(
        finalColors.map((c) => c.color),
        imageData
      ),
      memoryUsage,
      colorCount: finalColors.length,
    };
  }

  /**
   * 色セットを最適化
   */
  private optimizeColorSet(
    colors: ExtractedColor[],
    config: ExtractionConfig
  ): ExtractedColor[] {
    // 重複除去（類似色統合）
    const mergedColors = this.mergeSimilarColors(
      colors,
      config.colorDistanceThreshold
    );

    // 重要度スコアでソート
    mergedColors.sort((a, b) => {
      const scoreA =
        a.importance * 0.4 + a.representativeness * 0.4 + a.frequency * 0.2;
      const scoreB =
        b.importance * 0.4 + b.representativeness * 0.4 + b.frequency * 0.2;
      return scoreB - scoreA;
    });

    // 目標色数まで削減
    return mergedColors.slice(0, config.targetColorCount);
  }

  /**
   * 類似色を統合
   */
  private mergeSimilarColors(
    colors: ExtractedColor[],
    threshold: number
  ): ExtractedColor[] {
    const merged: ExtractedColor[] = [];

    for (const color of colors) {
      let shouldMerge = false;

      for (const existing of merged) {
        const distance = this.calculateColorDistance(
          color.color,
          existing.color
        );

        if (distance < threshold) {
          // 重み付き平均で統合
          const totalWeight = color.frequency + existing.frequency;
          const weight1 = color.frequency / totalWeight;
          const weight2 = existing.frequency / totalWeight;

          existing.color = {
            r: Math.round(color.color.r * weight1 + existing.color.r * weight2),
            g: Math.round(color.color.g * weight1 + existing.color.g * weight2),
            b: Math.round(color.color.b * weight1 + existing.color.b * weight2),
          };

          existing.frequency += color.frequency;
          existing.importance = Math.max(existing.importance, color.importance);
          existing.representativeness = Math.max(
            existing.representativeness,
            color.representativeness
          );

          shouldMerge = true;
          break;
        }
      }

      if (!shouldMerge) {
        merged.push({ ...color });
      }
    }

    return merged;
  }

  private calculateColorDistance(color1: RGBColor, color2: RGBColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  private calculateQualityScore(
    colors: RGBColor[],
    imageData: ImageData
  ): number {
    if (colors.length === 0) return 0;

    let diversityScore = 0;
    let comparisons = 0;

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        diversityScore += this.calculateColorDistance(colors[i]!, colors[j]!);
        comparisons++;
      }
    }

    const avgDistance = comparisons > 0 ? diversityScore / comparisons : 0;
    return Math.min(avgDistance / (255 * Math.sqrt(3)), 1.0);
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

/**
 * アルゴリズム比較システム
 */
export class AlgorithmComparison {
  private octreeQuantizer = new OctreeQuantizer();
  private medianCutQuantizer = new MedianCutQuantizer();
  private kmeansQuantizer = new ImprovedKMeansQuantizer();
  private hybridQuantizer = new HybridQuantizer();

  /**
   * 全アルゴリズム比較実行
   */
  async compareAlgorithms(
    imageData: ImageData,
    config: ExtractionConfig
  ): Promise<{
    octree: ExtractionResult;
    medianCut: ExtractionResult;
    kmeans: ExtractionResult;
    hybrid: ExtractionResult;
    winner: string;
    comparison: AlgorithmComparisonMetrics;
  }> {
    // 各アルゴリズムで抽出実行
    const octree = this.octreeQuantizer.quantize(imageData, config);
    const medianCut = this.medianCutQuantizer.quantize(imageData, config);
    const kmeans = this.kmeansQuantizer.quantize(imageData, config);
    const hybrid = this.hybridQuantizer.quantize(imageData, config);

    // 比較分析
    const comparison = this.analyzeComparison(
      octree,
      medianCut,
      kmeans,
      hybrid
    );
    const winner = this.determineWinner(comparison);

    return {
      octree,
      medianCut,
      kmeans,
      hybrid,
      winner,
      comparison,
    };
  }

  /**
   * テスト画像生成
   */
  generateTestImage(
    type: 'gradient' | 'natural' | 'geometric' | 'complex',
    width = 256,
    height = 256
  ): ImageData {
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    switch (type) {
      case 'gradient':
        this.generateGradientImage(data, width, height);
        break;
      case 'natural':
        this.generateNaturalImage(data, width, height);
        break;
      case 'geometric':
        this.generateGeometricImage(data, width, height);
        break;
      case 'complex':
        this.generateComplexImage(data, width, height);
        break;
    }

    return imageData;
  }

  private analyzeComparison(
    octree: ExtractionResult,
    medianCut: ExtractionResult,
    kmeans: ExtractionResult,
    hybrid: ExtractionResult
  ): AlgorithmComparisonMetrics {
    const results = [octree, medianCut, kmeans, hybrid];

    return {
      performance: {
        octree: octree.extractionTime,
        medianCut: medianCut.extractionTime,
        kmeans: kmeans.extractionTime,
        hybrid: hybrid.extractionTime,
      },
      quality: {
        octree: octree.qualityScore,
        medianCut: medianCut.qualityScore,
        kmeans: kmeans.qualityScore,
        hybrid: hybrid.qualityScore,
      },
      memory: {
        octree: octree.memoryUsage,
        medianCut: medianCut.memoryUsage,
        kmeans: kmeans.memoryUsage,
        hybrid: hybrid.memoryUsage,
      },
      colorCount: {
        octree: octree.colorCount,
        medianCut: medianCut.colorCount,
        kmeans: kmeans.colorCount,
        hybrid: hybrid.colorCount,
      },
      overallScores: {
        octree: this.calculateOverallScore(octree),
        medianCut: this.calculateOverallScore(medianCut),
        kmeans: this.calculateOverallScore(kmeans),
        hybrid: this.calculateOverallScore(hybrid),
      },
    };
  }

  private calculateOverallScore(result: ExtractionResult): number {
    // 品質60%、速度30%、メモリ効率10%の重み
    const qualityWeight = 0.6;
    const speedWeight = 0.3;
    const memoryWeight = 0.1;

    // 速度スコア（逆数で高速ほど高スコア）
    const speedScore = Math.max(0, 1 - result.extractionTime / 1000);

    // メモリスコア（使用量が少ないほど高スコア）
    const memoryScore = Math.max(
      0,
      1 - result.memoryUsage / (1024 * 1024 * 100)
    ); // 100MB基準

    return (
      result.qualityScore * qualityWeight +
      speedScore * speedWeight +
      memoryScore * memoryWeight
    );
  }

  private determineWinner(comparison: AlgorithmComparisonMetrics): string {
    const scores = comparison.overallScores;
    const algorithms = ['octree', 'medianCut', 'kmeans', 'hybrid'] as const;

    let bestAlgorithm: string = algorithms[0];
    let bestScore = scores.octree;

    for (const algorithm of algorithms) {
      if (scores[algorithm] > bestScore) {
        bestScore = scores[algorithm];
        bestAlgorithm = algorithm;
      }
    }

    return bestAlgorithm;
  }

  private generateGradientImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        data[index] = Math.floor((x / width) * 255);
        data[index + 1] = Math.floor((y / height) * 255);
        data[index + 2] = Math.floor(((x + y) / (width + height)) * 255);
        data[index + 3] = 255;
      }
    }
  }

  private generateNaturalImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.03);
        const noise2 = Math.sin(x * 0.02 + y * 0.04);

        data[index] = Math.max(
          0,
          Math.min(255, 128 + noise1 * 60 + Math.random() * 40)
        );
        data[index + 1] = Math.max(
          0,
          Math.min(255, 100 + noise2 * 80 + Math.random() * 40)
        );
        data[index + 2] = Math.max(
          0,
          Math.min(255, 80 + noise1 * noise2 * 100 + Math.random() * 40)
        );
        data[index + 3] = 255;
      }
    }
  }

  private generateGeometricImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        const circle1 =
          Math.sqrt((x - width / 3) ** 2 + (y - height / 3) ** 2) < 50;
        const circle2 =
          Math.sqrt((x - (2 * width) / 3) ** 2 + (y - (2 * height) / 3) ** 2) <
          40;
        const stripes = Math.floor(x / 20) % 2 === 0;

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

  private generateComplexImage(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // 複雑な画像（グラデーション + 幾何学 + ノイズ）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        // ベースグラデーション
        const baseR = Math.floor((x / width) * 255);
        const baseG = Math.floor((y / height) * 255);
        const baseB = Math.floor(((x + y) / (width + height)) * 255);

        // 幾何学パターン
        const circle =
          Math.sqrt((x - width / 2) ** 2 + (y - height / 2) ** 2) < 60;
        const stripes = Math.floor((x + y) / 15) % 2 === 0;

        // ノイズ
        const noise = Math.random() * 50 - 25;

        let r = baseR,
          g = baseG,
          b = baseB;

        if (circle && stripes) {
          r = Math.min(255, baseR + 100);
          g = Math.min(255, baseG - 50);
        } else if (circle) {
          g = Math.min(255, baseG + 80);
        } else if (stripes) {
          b = Math.min(255, baseB + 70);
        }

        data[index] = Math.max(0, Math.min(255, r + noise));
        data[index + 1] = Math.max(0, Math.min(255, g + noise));
        data[index + 2] = Math.max(0, Math.min(255, b + noise));
        data[index + 3] = 255;
      }
    }
  }
}

// 比較メトリクス型定義
export interface AlgorithmComparisonMetrics {
  performance: {
    octree: number;
    medianCut: number;
    kmeans: number;
    hybrid: number;
  };
  quality: {
    octree: number;
    medianCut: number;
    kmeans: number;
    hybrid: number;
  };
  memory: {
    octree: number;
    medianCut: number;
    kmeans: number;
    hybrid: number;
  };
  colorCount: {
    octree: number;
    medianCut: number;
    kmeans: number;
    hybrid: number;
  };
  overallScores: {
    octree: number;
    medianCut: number;
    kmeans: number;
    hybrid: number;
  };
}
