import { PerformanceTracker } from '../../shared/src/benchmark.js';

const logger = {
  info: (msg: string) => console.log(`[CommOverhead] ${msg}`),
};

export interface OverheadMeasurement {
  dataSize: number; // バイト数
  serializationTime: number; // シリアル化時間（ms）
  transferTime: number; // 転送時間（ms）
  deserializationTime: number; // デシリアル化時間（ms）
  totalOverhead: number; // 総オーバーヘッド（ms）
}

export class CommunicationOverheadAnalyzer {
  private perf = new PerformanceTracker();

  async measureImageDataTransfer(
    imageData: ImageData
  ): Promise<OverheadMeasurement> {
    const dataSize = imageData.data.byteLength;

    // シリアル化測定
    this.perf.start('serialization');
    const serializedData = this.serializeImageData(imageData);
    const serializationResult = this.perf.end('serialization');
    const serializationTime = serializationResult.duration;

    // 転送測定（Worker経由）
    const transferTime = await this.measureWorkerTransfer(serializedData);

    // デシリアル化測定
    this.perf.start('deserialization');
    const deserializedData = this.deserializeImageData(serializedData);
    const deserializationResult = this.perf.end('deserialization');
    const deserializationTime = deserializationResult.duration;

    const totalOverhead =
      serializationTime + transferTime + deserializationTime;

    const measurement: OverheadMeasurement = {
      dataSize,
      serializationTime,
      transferTime,
      deserializationTime,
      totalOverhead,
    };

    logger.info(
      `Communication overhead: ${totalOverhead.toFixed(2)}ms for ${(dataSize / 1024 / 1024).toFixed(2)}MB`
    );

    return measurement;
  }

  private serializeImageData(imageData: ImageData): ArrayBuffer {
    // ImageDataをTransferable Objectとして準備
    const buffer = new ArrayBuffer(imageData.data.byteLength + 8);
    const view = new DataView(buffer);

    // メタデータ（width, height）を格納
    view.setUint32(0, imageData.width);
    view.setUint32(4, imageData.height);

    // ピクセルデータをコピー
    const pixelData = new Uint8ClampedArray(buffer, 8);
    pixelData.set(imageData.data);

    return buffer;
  }

  private deserializeImageData(buffer: ArrayBuffer): ImageData {
    const view = new DataView(buffer);
    const width = view.getUint32(0);
    const height = view.getUint32(4);
    const pixelData = new Uint8ClampedArray(buffer, 8);

    return new ImageData(pixelData, width, height);
  }

  private async measureWorkerTransfer(data: ArrayBuffer): Promise<number> {
    return new Promise((resolve) => {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob(
            [
              `
          self.onmessage = function(event) {
            const startTime = performance.now();
            // データを受信してすぐに返送
            const duration = performance.now() - startTime;
            self.postMessage({ duration, dataSize: event.data.byteLength });
          }
        `,
            ],
            { type: 'application/javascript' }
          )
        )
      );

      const startTime = performance.now();

      worker.onmessage = (event) => {
        const transferTime = performance.now() - startTime;
        worker.terminate();
        resolve(transferTime);
      };

      worker.postMessage(data, [data]);
    });
  }

  async analyzeOverheadScaling(
    baseSizes: number[] = [128, 256, 512, 1024, 2048]
  ): Promise<OverheadMeasurement[]> {
    const results: OverheadMeasurement[] = [];

    for (const size of baseSizes) {
      // テスト用画像データを生成
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d')!;

      // ランダムなテストパターンを描画
      const imageData = ctx.createImageData(size, size);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255; // R
        imageData.data[i + 1] = Math.random() * 255; // G
        imageData.data[i + 2] = Math.random() * 255; // B
        imageData.data[i + 3] = 255; // A
      }

      const measurement = await this.measureImageDataTransfer(imageData);
      results.push(measurement);

      logger.info(
        `${size}x${size}: ${measurement.totalOverhead.toFixed(2)}ms overhead`
      );
    }

    return results;
  }

  analyzeOverheadReport(measurements: OverheadMeasurement[]): string {
    const report = [
      `
Communication Overhead Analysis Report
=====================================
`,
    ];

    measurements.forEach((measurement, index) => {
      const {
        dataSize,
        serializationTime,
        transferTime,
        deserializationTime,
        totalOverhead,
      } = measurement;
      const sizeMB = dataSize / 1024 / 1024;
      const throughputMBps = sizeMB / (totalOverhead / 1000);

      report.push(`
Measurement ${index + 1}:
- Data Size: ${sizeMB.toFixed(2)} MB
- Serialization: ${serializationTime.toFixed(2)}ms
- Transfer: ${transferTime.toFixed(2)}ms  
- Deserialization: ${deserializationTime.toFixed(2)}ms
- Total Overhead: ${totalOverhead.toFixed(2)}ms
- Throughput: ${throughputMBps.toFixed(2)} MB/s
`);
    });

    // 統計分析
    const avgOverhead =
      measurements.reduce((sum, m) => sum + m.totalOverhead, 0) /
      measurements.length;
    const avgThroughput =
      measurements.reduce(
        (sum, m) => sum + m.dataSize / 1024 / 1024 / (m.totalOverhead / 1000),
        0
      ) / measurements.length;

    report.push(`
Summary Statistics:
- Average Overhead: ${avgOverhead.toFixed(2)}ms
- Average Throughput: ${avgThroughput.toFixed(2)} MB/s
- Serialization Ratio: ${((measurements.reduce((sum, m) => sum + m.serializationTime, 0) / measurements.reduce((sum, m) => sum + m.totalOverhead, 0)) * 100).toFixed(1)}%
- Transfer Ratio: ${((measurements.reduce((sum, m) => sum + m.transferTime, 0) / measurements.reduce((sum, m) => sum + m.totalOverhead, 0)) * 100).toFixed(1)}%
- Deserialization Ratio: ${((measurements.reduce((sum, m) => sum + m.deserializationTime, 0) / measurements.reduce((sum, m) => sum + m.totalOverhead, 0)) * 100).toFixed(1)}%

Recommendations:
${this.generateRecommendations(measurements)}
`);

    return report.join('');
  }

  private generateRecommendations(measurements: OverheadMeasurement[]): string {
    const recommendations: string[] = [];

    const avgOverhead =
      measurements.reduce((sum, m) => sum + m.totalOverhead, 0) /
      measurements.length;
    const maxOverhead = Math.max(...measurements.map((m) => m.totalOverhead));

    if (avgOverhead > 50) {
      recommendations.push(
        '- Consider reducing chunk size to minimize communication overhead'
      );
    }

    if (maxOverhead > 200) {
      recommendations.push(
        '- Large data transfers detected - implement progressive streaming'
      );
    }

    const serializationRatio =
      measurements.reduce((sum, m) => sum + m.serializationTime, 0) /
      measurements.reduce((sum, m) => sum + m.totalOverhead, 0);
    if (serializationRatio > 0.3) {
      recommendations.push(
        '- High serialization overhead - consider using SharedArrayBuffer'
      );
    }

    const transferRatio =
      measurements.reduce((sum, m) => sum + m.transferTime, 0) /
      measurements.reduce((sum, m) => sum + m.totalOverhead, 0);
    if (transferRatio > 0.5) {
      recommendations.push(
        '- High transfer overhead - optimize data compression or use smaller chunks'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        '- Communication overhead is acceptable for current use case'
      );
    }

    return recommendations.join('\n');
  }
}
