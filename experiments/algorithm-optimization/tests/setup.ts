/**
 * Vitest テストセットアップ
 */

// ImageData のモック（Node.js環境用）
if (typeof global !== 'undefined' && !global.ImageData) {
  global.ImageData = class ImageData {
    public data: Uint8ClampedArray;
    public width: number;
    public height: number;

    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      width?: number,
      height?: number
    ) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = width || dataOrWidth;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = dataOrWidth;
        this.width = width || 0;
        this.height = height || 0;
      }
    }
  } as any;
}

// performance.now のモック
let mockTime = 1000;
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: () => {
      mockTime += Math.random() * 100 + 20; // 20-120ms の実行時間をシミュレート
      return mockTime;
    },
    memory: {
      usedJSHeapSize: Math.floor(Math.random() * 1024 * 1024 * 50), // 0-50MB
      totalJSHeapSize: 2 * 1024 * 1024,
      jsHeapSizeLimit: 4 * 1024 * 1024,
    },
  },
});

// Math.random のモック（再現可能なテスト用）
let mockRandomSeed = 54321;
const originalRandom = Math.random;

export function mockRandom(): void {
  Math.random = () => {
    mockRandomSeed = (mockRandomSeed * 9301 + 49297) % 233280;
    return mockRandomSeed / 233280;
  };
}

export function restoreRandom(): void {
  Math.random = originalRandom;
}

// DOM APIのモック
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
    }),
  });
}
