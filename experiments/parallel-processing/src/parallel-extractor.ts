import { WorkerPool, type WorkerTask } from './worker-pool.js';
import type {
  ColorData,
  ExtractionConfig,
} from '../../color-extraction/src/types.js';
import type { ColorExtractionTask } from './color-extraction-worker.js';

const logger = {
  info: (msg: string) => console.log(`[ParallelExtractor] ${msg}`),
  error: (msg: string, error?: any) =>
    console.error(`[ParallelExtractor] ${msg}`, error),
  success: (msg: string) => console.log(`[ParallelExtractor] ✅ ${msg}`),
};

export interface DataSplitStrategy {
  type: 'grid' | 'stripe' | 'adaptive';
  chunks: number;
}

export class ParallelColorExtractor {
  private workerPool: WorkerPool;
  private config: Required<ExtractionConfig>;

  constructor(config: ExtractionConfig, workerCount?: number) {
    this.config = {
      algorithm: 'kmeans',
      maxIterations: 100,
      convergenceThreshold: 1.0,
      ...config,
    };

    // Worker scriptのパスを動的に生成
    const workerScript = new URL(
      './color-extraction-worker.js',
      import.meta.url
    ).href;
    this.workerPool = new WorkerPool(workerScript, workerCount);
  }

  async extract(
    imageData: ImageData,
    strategy: DataSplitStrategy = { type: 'grid', chunks: 4 }
  ): Promise<ColorData[]> {
    const startTime = performance.now();

    logger.info(
      `Starting parallel extraction with ${strategy.chunks} chunks (${strategy.type} strategy)`
    );

    // 画像データを分割
    const chunks = this.splitImageData(imageData, strategy);

    // 各チャンクでタスクを作成
    const tasks: WorkerTask<ColorExtractionTask>[] = chunks.map(
      (chunk, index) => ({
        id: `chunk-${index}`,
        data: {
          imageDataChunk: {
            data: chunk.data,
            width: chunk.width,
            height: chunk.height,
          },
          config: this.config,
          chunkId: index,
        },
        transferables: [chunk.data.buffer],
      })
    );

    // 並列実行
    const results = await this.workerPool.executeAll(tasks);

    // 結果をマージ
    const allColors: ColorData[] = [];
    let totalDuration = 0;

    for (const result of results) {
      if (result.error) {
        logger.error(`Chunk processing failed: ${result.error}`);
        continue;
      }

      allColors.push(...result.result.colors);
      totalDuration += result.duration;
    }

    // 最終的な色数に削減（重複排除とクラスタリング）
    const finalColors = this.mergeDuplicateColors(
      allColors,
      this.config.colorCount
    );

    const overallDuration = performance.now() - startTime;
    logger.info(
      `Parallel extraction completed: ${finalColors.length} colors in ${overallDuration.toFixed(2)}ms (worker time: ${totalDuration.toFixed(2)}ms)`
    );

    return finalColors;
  }

  private splitImageData(
    imageData: ImageData,
    strategy: DataSplitStrategy
  ): ImageData[] {
    const { data, width, height } = imageData;
    const chunks: ImageData[] = [];

    switch (strategy.type) {
      case 'grid':
        return this.splitGrid(imageData, strategy.chunks);

      case 'stripe':
        return this.splitStripe(imageData, strategy.chunks);

      case 'adaptive':
        return this.splitAdaptive(imageData, strategy.chunks);

      default:
        throw new Error(`Unknown split strategy: ${strategy.type}`);
    }
  }

  private splitGrid(imageData: ImageData, chunks: number): ImageData[] {
    const { data, width, height } = imageData;
    const result: ImageData[] = [];

    // グリッド分割（2x2, 3x3など）
    const gridSize = Math.ceil(Math.sqrt(chunks));
    const chunkWidth = Math.floor(width / gridSize);
    const chunkHeight = Math.floor(height / gridSize);

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (result.length >= chunks) break;

        const startX = col * chunkWidth;
        const startY = row * chunkHeight;
        const endX = Math.min((col + 1) * chunkWidth, width);
        const endY = Math.min((row + 1) * chunkHeight, height);

        const actualWidth = endX - startX;
        const actualHeight = endY - startY;
        const chunkData = new Uint8ClampedArray(actualWidth * actualHeight * 4);

        for (let y = 0; y < actualHeight; y++) {
          for (let x = 0; x < actualWidth; x++) {
            const srcIndex = ((startY + y) * width + (startX + x)) * 4;
            const dstIndex = (y * actualWidth + x) * 4;

            chunkData[dstIndex] = data[srcIndex]; // R
            chunkData[dstIndex + 1] = data[srcIndex + 1]; // G
            chunkData[dstIndex + 2] = data[srcIndex + 2]; // B
            chunkData[dstIndex + 3] = data[srcIndex + 3]; // A
          }
        }

        result.push(new ImageData(chunkData, actualWidth, actualHeight));
      }
    }

    return result;
  }

  private splitStripe(imageData: ImageData, chunks: number): ImageData[] {
    const { data, width, height } = imageData;
    const result: ImageData[] = [];
    const stripeHeight = Math.floor(height / chunks);

    for (let i = 0; i < chunks; i++) {
      const startY = i * stripeHeight;
      const endY = i === chunks - 1 ? height : (i + 1) * stripeHeight;
      const actualHeight = endY - startY;

      const chunkData = new Uint8ClampedArray(width * actualHeight * 4);

      for (let y = 0; y < actualHeight; y++) {
        const srcRowStart = (startY + y) * width * 4;
        const dstRowStart = y * width * 4;

        for (let x = 0; x < width * 4; x++) {
          chunkData[dstRowStart + x] = data[srcRowStart + x];
        }
      }

      result.push(new ImageData(chunkData, width, actualHeight));
    }

    return result;
  }

  private splitAdaptive(imageData: ImageData, chunks: number): ImageData[] {
    // 画像の複雑度に基づく適応的分割
    // 今回は簡易版でエッジ検出ベースの分割を実装
    const { data, width, height } = imageData;

    // エッジ密度を計算
    const edgeDensity = this.calculateEdgeDensity(imageData);

    // エッジ密度の高い領域を優先的に小さなチャンクに分割
    const adaptiveChunks = this.createAdaptiveChunks(
      width,
      height,
      edgeDensity,
      chunks
    );

    const result: ImageData[] = [];

    for (const chunk of adaptiveChunks) {
      const chunkData = new Uint8ClampedArray(chunk.width * chunk.height * 4);

      for (let y = 0; y < chunk.height; y++) {
        for (let x = 0; x < chunk.width; x++) {
          const srcIndex =
            ((chunk.startY + y) * width + (chunk.startX + x)) * 4;
          const dstIndex = (y * chunk.width + x) * 4;

          chunkData[dstIndex] = data[srcIndex]; // R
          chunkData[dstIndex + 1] = data[srcIndex + 1]; // G
          chunkData[dstIndex + 2] = data[srcIndex + 2]; // B
          chunkData[dstIndex + 3] = data[srcIndex + 3]; // A
        }
      }

      result.push(new ImageData(chunkData, chunk.width, chunk.height));
    }

    return result;
  }

  private calculateEdgeDensity(imageData: ImageData): Float32Array {
    const { data, width, height } = imageData;
    const density = new Float32Array(width * height);

    // 簡易Sobelエッジ検出
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = this.sobelX(data, x, y, width);
        const gy = this.sobelY(data, x, y, width);
        density[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return density;
  }

  private sobelX(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): number {
    const kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    let sum = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const px = x + kx;
        const py = y + ky;
        const idx = (py * width + px) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray * kernel[(ky + 1) * 3 + (kx + 1)];
      }
    }

    return sum;
  }

  private sobelY(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): number {
    const kernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    let sum = 0;

    for (let ky = -1; ky <= 1; ky++) {
      for (let kx = -1; kx <= 1; kx++) {
        const px = x + kx;
        const py = y + ky;
        const idx = (py * width + px) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        sum += gray * kernel[(ky + 1) * 3 + (kx + 1)];
      }
    }

    return sum;
  }

  private createAdaptiveChunks(
    width: number,
    height: number,
    edgeDensity: Float32Array,
    chunks: number
  ): Array<{
    startX: number;
    startY: number;
    width: number;
    height: number;
  }> {
    // 簡易版：エッジ密度に基づく重み付きグリッド分割
    const gridSize = Math.ceil(Math.sqrt(chunks));
    const baseChunkWidth = Math.floor(width / gridSize);
    const baseChunkHeight = Math.floor(height / gridSize);

    const result = [];

    for (let row = 0; row < gridSize && result.length < chunks; row++) {
      for (let col = 0; col < gridSize && result.length < chunks; col++) {
        const startX = col * baseChunkWidth;
        const startY = row * baseChunkHeight;
        const chunkWidth =
          col === gridSize - 1 ? width - startX : baseChunkWidth;
        const chunkHeight =
          row === gridSize - 1 ? height - startY : baseChunkHeight;

        result.push({
          startX,
          startY,
          width: chunkWidth,
          height: chunkHeight,
        });
      }
    }

    return result;
  }

  private mergeDuplicateColors(
    colors: ColorData[],
    targetCount: number
  ): ColorData[] {
    // 簡易版：RGB値での重複排除と最も代表的な色の選択
    const colorMap = new Map<string, ColorData[]>();

    // RGB値でグループ化
    for (const color of colors) {
      const key = `${Math.round(color.rgb.r / 10) * 10}-${Math.round(color.rgb.g / 10) * 10}-${Math.round(color.rgb.b / 10) * 10}`;
      if (!colorMap.has(key)) {
        colorMap.set(key, []);
      }
      colorMap.get(key)!.push(color);
    }

    // 各グループから代表色を選択
    const representatives: ColorData[] = [];
    for (const group of colorMap.values()) {
      if (group.length === 1) {
        representatives.push(group[0]);
      } else {
        // グループの平均色を計算
        const avgR = group.reduce((sum, c) => sum + c.rgb.r, 0) / group.length;
        const avgG = group.reduce((sum, c) => sum + c.rgb.g, 0) / group.length;
        const avgB = group.reduce((sum, c) => sum + c.rgb.b, 0) / group.length;

        // 平均に最も近い色を選択
        let closest = group[0];
        let minDistance = Infinity;

        for (const color of group) {
          const distance = Math.sqrt(
            Math.pow(color.rgb.r - avgR, 2) +
              Math.pow(color.rgb.g - avgG, 2) +
              Math.pow(color.rgb.b - avgB, 2)
          );

          if (distance < minDistance) {
            minDistance = distance;
            closest = color;
          }
        }

        representatives.push(closest);
      }
    }

    // 目標色数まで削減
    if (representatives.length <= targetCount) {
      return representatives;
    }

    // 輝度でソートして均等に選択
    const sorted = representatives.sort((a, b) => a.luminance - b.luminance);
    const step = sorted.length / targetCount;
    const result: ColorData[] = [];

    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      result.push(sorted[Math.min(index, sorted.length - 1)]);
    }

    return result;
  }

  getWorkerPoolStatus() {
    return this.workerPool.getPoolStatus();
  }

  terminate(): void {
    this.workerPool.terminate();
  }
}
