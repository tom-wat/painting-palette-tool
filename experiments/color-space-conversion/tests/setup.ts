/**
 * Vitest テストセットアップ
 */

// DOM APIのモック
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

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
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: () => Date.now(),
    memory: {
      usedJSHeapSize: 1024 * 1024,
      totalJSHeapSize: 2 * 1024 * 1024,
      jsHeapSizeLimit: 4 * 1024 * 1024,
    },
  },
});

// Math.cbrt のポリフィル（古いNode.jsバージョン対応）
if (!Math.cbrt) {
  Math.cbrt = function (x: number) {
    return Math.pow(x, 1 / 3);
  };
}
