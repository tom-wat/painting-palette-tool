const logger = {
  warn: (msg: string) => console.warn(`[SharedArrayBuffer] ⚠️ ${msg}`),
  error: (msg: string, error?: any) =>
    console.error(`[SharedArrayBuffer] ${msg}`, error),
  info: (msg: string) => console.log(`[SharedArrayBuffer] ${msg}`),
};

export interface SharedBufferPerformance {
  isSupported: boolean;
  setupTime: number;
  writeTime: number;
  readTime: number;
  communicationTime: number;
  totalTime: number;
}

export class SharedArrayBufferAnalyzer {
  async testSharedArrayBufferSupport(): Promise<boolean> {
    try {
      // SharedArrayBufferの基本サポート確認
      if (typeof SharedArrayBuffer === 'undefined') {
        logger.warn('SharedArrayBuffer is not available');
        return false;
      }

      // Cross-Origin Isolation確認
      if (!crossOriginIsolated) {
        logger.warn('SharedArrayBuffer requires cross-origin isolation');
        return false;
      }

      // 基本的な動作テスト
      const buffer = new SharedArrayBuffer(1024);
      const view = new Int32Array(buffer);
      view[0] = 42;

      logger.info('SharedArrayBuffer is fully supported');
      return true;
    } catch (error) {
      logger.error('SharedArrayBuffer test failed:', error);
      return false;
    }
  }

  async measureSharedBufferPerformance(
    dataSize: number = 1024 * 1024
  ): Promise<SharedBufferPerformance> {
    const startTime = performance.now();

    const isSupported = await this.testSharedArrayBufferSupport();

    if (!isSupported) {
      return {
        isSupported: false,
        setupTime: 0,
        writeTime: 0,
        readTime: 0,
        communicationTime: 0,
        totalTime: 0,
      };
    }

    // セットアップ時間測定
    const setupStart = performance.now();
    const sharedBuffer = new SharedArrayBuffer(dataSize);
    const sharedView = new Uint8Array(sharedBuffer);
    const setupTime = performance.now() - setupStart;

    // 書き込み性能測定
    const writeStart = performance.now();
    for (let i = 0; i < dataSize; i++) {
      sharedView[i] = i % 256;
    }
    const writeTime = performance.now() - writeStart;

    // 読み込み性能測定
    const readStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < dataSize; i++) {
      checksum += sharedView[i];
    }
    const readTime = performance.now() - readStart;

    // Worker間通信時間測定
    const communicationTime =
      await this.measureWorkerCommunication(sharedBuffer);

    const totalTime = performance.now() - startTime;

    const performance_result: SharedBufferPerformance = {
      isSupported: true,
      setupTime,
      writeTime,
      readTime,
      communicationTime,
      totalTime,
    };

    logger.info(
      `SharedArrayBuffer performance: ${totalTime.toFixed(2)}ms total for ${(dataSize / 1024).toFixed(0)}KB`
    );

    return performance_result;
  }

  private async measureWorkerCommunication(
    sharedBuffer: SharedArrayBuffer
  ): Promise<number> {
    return new Promise((resolve) => {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob(
            [
              `
          self.onmessage = function(event) {
            const startTime = performance.now();
            const sharedArray = new Uint8Array(event.data.buffer);
            
            // SharedArrayBufferの内容を変更
            for (let i = 0; i < Math.min(1000, sharedArray.length); i++) {
              sharedArray[i] = 255 - sharedArray[i];
            }
            
            const duration = performance.now() - startTime;
            self.postMessage({ duration });
          }
        `,
            ],
            { type: 'application/javascript' }
          )
        )
      );

      const startTime = performance.now();

      worker.onmessage = (event) => {
        const communicationTime = performance.now() - startTime;
        worker.terminate();
        resolve(communicationTime);
      };

      worker.postMessage({ buffer: sharedBuffer });
    });
  }

  async compareWithRegularArrayBuffer(dataSize: number = 1024 * 1024): Promise<{
    shared: SharedBufferPerformance;
    regular: {
      setupTime: number;
      writeTime: number;
      readTime: number;
      communicationTime: number;
      totalTime: number;
    };
    speedup: number;
  }> {
    logger.info('Comparing SharedArrayBuffer vs regular ArrayBuffer...');

    // SharedArrayBuffer測定
    const shared = await this.measureSharedBufferPerformance(dataSize);

    // 通常のArrayBuffer測定
    const regularStart = performance.now();

    const setupStart = performance.now();
    const regularBuffer = new ArrayBuffer(dataSize);
    const regularView = new Uint8Array(regularBuffer);
    const setupTime = performance.now() - setupStart;

    const writeStart = performance.now();
    for (let i = 0; i < dataSize; i++) {
      regularView[i] = i % 256;
    }
    const writeTime = performance.now() - writeStart;

    const readStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < dataSize; i++) {
      checksum += regularView[i];
    }
    const readTime = performance.now() - readStart;

    const communicationTime =
      await this.measureRegularBufferCommunication(regularBuffer);
    const totalTime = performance.now() - regularStart;

    const regular = {
      setupTime,
      writeTime,
      readTime,
      communicationTime,
      totalTime,
    };

    const speedup = shared.isSupported
      ? regular.totalTime / shared.totalTime
      : 0;

    logger.info(`Performance comparison - Speedup: ${speedup.toFixed(2)}x`);

    return { shared, regular, speedup };
  }

  private async measureRegularBufferCommunication(
    buffer: ArrayBuffer
  ): Promise<number> {
    return new Promise((resolve) => {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob(
            [
              `
          self.onmessage = function(event) {
            const startTime = performance.now();
            const array = new Uint8Array(event.data.buffer);
            
            // データを変更して返送
            for (let i = 0; i < Math.min(1000, array.length); i++) {
              array[i] = 255 - array[i];
            }
            
            const duration = performance.now() - startTime;
            self.postMessage({ duration, buffer: array.buffer }, [array.buffer]);
          }
        `,
            ],
            { type: 'application/javascript' }
          )
        )
      );

      const startTime = performance.now();

      worker.onmessage = (event) => {
        const communicationTime = performance.now() - startTime;
        worker.terminate();
        resolve(communicationTime);
      };

      // コピーして送信（Transferable Objectとして）
      const bufferCopy = buffer.slice(0);
      worker.postMessage({ buffer: bufferCopy }, [bufferCopy]);
    });
  }

  generateSharedBufferReport(comparison: {
    shared: SharedBufferPerformance;
    regular: any;
    speedup: number;
  }): string {
    const { shared, regular, speedup } = comparison;

    return `
SharedArrayBuffer vs ArrayBuffer Performance Report
=================================================

SharedArrayBuffer Support: ${shared.isSupported ? 'YES' : 'NO'}
${!shared.isSupported ? 'Note: SharedArrayBuffer requires cross-origin isolation (COOP/COEP headers)' : ''}

Performance Comparison:
                    SharedArrayBuffer    ArrayBuffer      Ratio
Setup Time:         ${shared.setupTime.toFixed(2)}ms             ${regular.setupTime.toFixed(2)}ms          ${(regular.setupTime / shared.setupTime).toFixed(2)}x
Write Time:         ${shared.writeTime.toFixed(2)}ms             ${regular.writeTime.toFixed(2)}ms          ${(regular.writeTime / shared.writeTime).toFixed(2)}x
Read Time:          ${shared.readTime.toFixed(2)}ms              ${regular.readTime.toFixed(2)}ms           ${(regular.readTime / shared.readTime).toFixed(2)}x
Communication:      ${shared.communicationTime.toFixed(2)}ms     ${regular.communicationTime.toFixed(2)}ms   ${(regular.communicationTime / shared.communicationTime).toFixed(2)}x
Total Time:         ${shared.totalTime.toFixed(2)}ms             ${regular.totalTime.toFixed(2)}ms          ${speedup.toFixed(2)}x

Key Insights:
- Overall Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? 'faster' : 'slower'} with SharedArrayBuffer
- Communication Improvement: ${(regular.communicationTime / shared.communicationTime).toFixed(2)}x faster data sharing
- Memory Efficiency: SharedArrayBuffer eliminates data copying overhead

Recommendations:
${this.generateSharedBufferRecommendations(shared, speedup)}

Browser Compatibility:
- SharedArrayBuffer requires HTTPS
- Requires Cross-Origin-Opener-Policy: same-origin
- Requires Cross-Origin-Embedder-Policy: require-corp
- May be disabled in some browsers due to Spectre concerns
`;
  }

  private generateSharedBufferRecommendations(
    shared: SharedBufferPerformance,
    speedup: number
  ): string {
    const recommendations: string[] = [];

    if (!shared.isSupported) {
      recommendations.push(
        '- Enable cross-origin isolation to use SharedArrayBuffer'
      );
      recommendations.push(
        '- Set appropriate COOP/COEP headers on your server'
      );
      recommendations.push(
        '- Consider fallback to regular ArrayBuffer with Transferable Objects'
      );
    } else if (speedup > 1.5) {
      recommendations.push(
        '- SharedArrayBuffer provides significant performance benefits'
      );
      recommendations.push('- Implement SharedArrayBuffer for production use');
      recommendations.push(
        '- Consider using SharedArrayBuffer for large image processing tasks'
      );
    } else if (speedup < 1.2) {
      recommendations.push(
        '- SharedArrayBuffer benefits are minimal for current use case'
      );
      recommendations.push(
        '- Regular ArrayBuffer with Transferable Objects may be sufficient'
      );
      recommendations.push('- Evaluate complexity vs performance trade-off');
    } else {
      recommendations.push(
        '- SharedArrayBuffer provides moderate performance benefits'
      );
      recommendations.push(
        '- Consider implementation based on application requirements'
      );
    }

    return recommendations.join('\n');
  }
}
