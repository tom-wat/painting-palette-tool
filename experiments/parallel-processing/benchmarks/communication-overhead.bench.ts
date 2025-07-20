import { bench, describe } from 'vitest';
import { CommunicationOverheadAnalyzer } from '../src/communication-overhead.js';
import { SharedArrayBufferAnalyzer } from '../src/shared-array-buffer-test.js';
import { testDataGenerator } from '../../shared/src/test-data.js';

describe('Communication Overhead Benchmarks', () => {
  const analyzer = new CommunicationOverheadAnalyzer();
  const sharedAnalyzer = new SharedArrayBufferAnalyzer();

  // さまざまなサイズでの通信オーバーヘッド測定
  const imageSizes = [
    { width: 256, height: 256, name: 'Small' },
    { width: 512, height: 512, name: 'Medium' },
    { width: 1024, height: 1024, name: 'Large' },
  ];

  imageSizes.forEach(({ width, height, name }) => {
    bench(`Communication Overhead - ${name} (${width}x${height})`, async () => {
      const imageData = testDataGenerator.generateTestImage({
        width,
        height,
        pattern: 'random',
      });
      await analyzer.measureImageDataTransfer(imageData);
    });
  });

  // SharedArrayBuffer vs ArrayBuffer比較
  const bufferSizes = [
    1024 * 1024, // 1MB
    4 * 1024 * 1024, // 4MB
    16 * 1024 * 1024, // 16MB
  ];

  bufferSizes.forEach((size) => {
    const sizeMB = size / (1024 * 1024);

    bench(`SharedArrayBuffer Performance - ${sizeMB}MB`, async () => {
      await sharedAnalyzer.measureSharedBufferPerformance(size);
    });

    bench(
      `ArrayBuffer vs SharedArrayBuffer Comparison - ${sizeMB}MB`,
      async () => {
        await sharedAnalyzer.compareWithRegularArrayBuffer(size);
      }
    );
  });
});

describe('Data Serialization Benchmarks', () => {
  const images = [
    testDataGenerator.generateTestImage({
      width: 512,
      height: 512,
      pattern: 'gradient',
    }),
    testDataGenerator.generateTestImage({
      width: 512,
      height: 512,
      pattern: 'random',
    }),
    testDataGenerator.generateTestImage({
      width: 512,
      height: 512,
      pattern: 'checkerboard',
    }),
  ];

  images.forEach((imageData, index) => {
    bench(`ImageData Serialization - Pattern ${index + 1}`, () => {
      // シリアル化性能のテスト
      const buffer = new ArrayBuffer(imageData.data.byteLength + 8);
      const view = new DataView(buffer);

      view.setUint32(0, imageData.width);
      view.setUint32(4, imageData.height);

      const pixelData = new Uint8ClampedArray(buffer, 8);
      pixelData.set(imageData.data);
    });

    bench(`ImageData Deserialization - Pattern ${index + 1}`, () => {
      // デシリアル化性能のテスト
      const buffer = new ArrayBuffer(imageData.data.byteLength + 8);
      const view = new DataView(buffer);

      // メタデータを設定
      view.setUint32(0, imageData.width);
      view.setUint32(4, imageData.height);

      // データをコピー
      const pixelData = new Uint8ClampedArray(buffer, 8);
      pixelData.set(imageData.data);

      // デシリアル化
      const width = view.getUint32(0);
      const height = view.getUint32(4);
      const resultData = new Uint8ClampedArray(buffer, 8);
      new ImageData(resultData, width, height);
    });
  });
});

describe('Worker Creation Overhead', () => {
  bench('Worker Creation and Termination', async () => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `
        self.onmessage = function(event) {
          self.postMessage({ received: true });
        }
      `,
          ],
          { type: 'application/javascript' }
        )
      )
    );

    await new Promise<void>((resolve) => {
      worker.onmessage = () => {
        worker.terminate();
        resolve();
      };
      worker.postMessage({ test: true });
    });
  });

  bench('Worker Pool Simulation (4 workers)', async () => {
    const workers: Worker[] = [];

    // ワーカープール作成
    for (let i = 0; i < 4; i++) {
      const worker = new Worker(
        URL.createObjectURL(
          new Blob(
            [
              `
          self.onmessage = function(event) {
            self.postMessage({ workerId: event.data.workerId, result: event.data.value * 2 });
          }
        `,
            ],
            { type: 'application/javascript' }
          )
        )
      );
      workers.push(worker);
    }

    // 並列タスク実行
    const tasks = Array.from(
      { length: 8 },
      (_, i) =>
        new Promise<void>((resolve) => {
          const worker = workers[i % workers.length];
          const handler = (event: MessageEvent) => {
            if (event.data.workerId === i) {
              worker.removeEventListener('message', handler);
              resolve();
            }
          };
          worker.addEventListener('message', handler);
          worker.postMessage({ workerId: i, value: i * 10 });
        })
    );

    await Promise.all(tasks);

    // クリーンアップ
    workers.forEach((worker) => worker.terminate());
  });
});
