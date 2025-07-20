// Web Worker for parallel color extraction

import type { WorkerTask, WorkerResult } from './worker-pool.js';
import { OptimizedKMeansExtractor } from '../../color-extraction/src/optimized-kmeans.js';
import type { ExtractionConfig } from '../../color-extraction/src/types.js';

export interface ColorExtractionTask {
  imageDataChunk: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  config: ExtractionConfig;
  chunkId: number;
}

// Worker thread処理
self.onmessage = async (
  event: MessageEvent<WorkerTask<ColorExtractionTask>>
) => {
  const startTime = performance.now();
  const { id, data } = event.data;

  try {
    // ImageDataを再構築
    const imageData = new ImageData(
      data.imageDataChunk.data,
      data.imageDataChunk.width,
      data.imageDataChunk.height
    );

    // 色抽出実行
    const extractor = new OptimizedKMeansExtractor(data.config);
    const colors = extractor.extract(imageData);

    const duration = performance.now() - startTime;

    const result: WorkerResult = {
      id,
      result: {
        colors,
        chunkId: data.chunkId,
        sampleCount: Math.floor(imageData.data.length / 4),
      },
      duration,
    };

    self.postMessage(result);
  } catch (error) {
    const duration = performance.now() - startTime;

    const result: WorkerResult = {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };

    self.postMessage(result);
  }
};
