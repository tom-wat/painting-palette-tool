// jsdom does not implement the ImageData constructor; polyfill the minimal
// shape used by src/lib (data, width, height) so canvas-adjacent code under
// test can construct ImageData without a real browser.
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace = 'srgb';

    constructor(data: Uint8ClampedArray, width: number, height?: number) {
      this.data = data;
      this.width = width;
      this.height = height ?? data.length / (4 * width);
    }
  }
  // @ts-expect-error assigning polyfill to the global ImageData
  globalThis.ImageData = ImageDataPolyfill;
}
