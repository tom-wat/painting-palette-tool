export interface TestImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface TestImageConfig {
  width: number;
  height: number;
  colorCount?: number;
  pattern?: 'random' | 'gradient' | 'checkerboard' | 'solid';
  seed?: number;
}

export class TestDataGenerator {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  // シンプルなPRNG実装（再現可能な結果のため）
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  generateTestImage(config: TestImageConfig): ImageData {
    const { width, height, colorCount = 256, pattern = 'random' } = config;
    const data = new Uint8ClampedArray(width * height * 4);

    switch (pattern) {
      case 'random':
        this.generateRandomPattern(data, width, height, colorCount);
        break;
      case 'gradient':
        this.generateGradientPattern(data, width, height);
        break;
      case 'checkerboard':
        this.generateCheckerboardPattern(data, width, height);
        break;
      case 'solid':
        this.generateSolidPattern(data, width, height);
        break;
    }

    // Node.js環境でのImageData polyfill
    if (typeof ImageData === 'undefined') {
      return {
        width,
        height,
        data,
        colorSpace: 'srgb' as PredefinedColorSpace,
      } as ImageData;
    }

    return new ImageData(data, width, height);
  }

  private generateRandomPattern(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    colorCount: number
  ): void {
    // 限定された色パレットを生成
    const palette: [number, number, number][] = [];
    for (let i = 0; i < colorCount; i++) {
      palette.push([
        this.randomInt(0, 255),
        this.randomInt(0, 255),
        this.randomInt(0, 255),
      ]);
    }

    for (let i = 0; i < width * height; i++) {
      const colorIndex = this.randomInt(0, palette.length - 1);
      const [r, g, b] = palette[colorIndex];

      const pixelIndex = i * 4;
      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = 255; // Alpha
    }
  }

  private generateGradientPattern(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;

        // 水平グラデーション（赤から青）
        const r = Math.floor((1 - x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = Math.floor((x / width) * 255);

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255;
      }
    }
  }

  private generateCheckerboardPattern(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const blockSize = 32;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;

        const blockX = Math.floor(x / blockSize);
        const blockY = Math.floor(y / blockSize);
        const isEven = (blockX + blockY) % 2 === 0;

        const value = isEven ? 255 : 0;

        data[pixelIndex] = value;
        data[pixelIndex + 1] = value;
        data[pixelIndex + 2] = value;
        data[pixelIndex + 3] = 255;
      }
    }
  }

  private generateSolidPattern(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    const r = this.randomInt(0, 255);
    const g = this.randomInt(0, 255);
    const b = this.randomInt(0, 255);

    for (let i = 0; i < width * height; i++) {
      const pixelIndex = i * 4;
      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = 255;
    }
  }

  // 様々なサイズのテストケースを生成
  generateTestSuite(): { name: string; image: ImageData }[] {
    return [
      {
        name: 'small-random',
        image: this.generateTestImage({
          width: 64,
          height: 64,
          pattern: 'random',
          colorCount: 16,
        }),
      },
      {
        name: 'medium-gradient',
        image: this.generateTestImage({
          width: 256,
          height: 256,
          pattern: 'gradient',
        }),
      },
      {
        name: 'large-random',
        image: this.generateTestImage({
          width: 512,
          height: 512,
          pattern: 'random',
          colorCount: 64,
        }),
      },
      {
        name: 'xlarge-checkerboard',
        image: this.generateTestImage({
          width: 1024,
          height: 1024,
          pattern: 'checkerboard',
        }),
      },
      {
        name: 'ultra-random',
        image: this.generateTestImage({
          width: 2048,
          height: 2048,
          pattern: 'random',
          colorCount: 256,
        }),
      },
    ];
  }
}

// 画像データの統計情報を取得
export function analyzeImageData(imageData: ImageData) {
  const { width, height, data } = imageData;
  const uniqueColors = new Set<string>();
  const colorFrequency = new Map<string, number>();

  for (let i = 0; i < width * height; i++) {
    const pixelIndex = i * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];

    const colorKey = `${r},${g},${b}`;
    uniqueColors.add(colorKey);

    const freq = colorFrequency.get(colorKey) || 0;
    colorFrequency.set(colorKey, freq + 1);
  }

  const colors = Array.from(colorFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color, freq]) => ({
      color: color.split(',').map(Number) as [number, number, number],
      frequency: freq,
      percentage: (freq / (width * height)) * 100,
    }));

  return {
    dimensions: { width, height },
    totalPixels: width * height,
    uniqueColors: uniqueColors.size,
    dominantColors: colors.slice(0, 10),
    colorDistribution: colors,
  };
}

export const testDataGenerator = new TestDataGenerator();
