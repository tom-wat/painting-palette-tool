import type { RGB, ColorData } from './types.js';
import { createColorData } from './utils.js';

interface ColorBox {
  colors: RGB[];
  minR: number;
  maxR: number;
  minG: number;
  maxG: number;
  minB: number;
  maxB: number;
}

export class MedianCutExtractor {
  private maxColors: number;

  constructor(maxColors: number) {
    this.maxColors = maxColors;
  }

  extract(imageData: ImageData): ColorData[] {
    const pixels = this.samplePixels(imageData);
    const boxes = this.medianCut(pixels, this.maxColors);

    return boxes.map((box) => {
      const avgColor = this.getAverageColor(box.colors);
      return createColorData(avgColor);
    });
  }

  private samplePixels(imageData: ImageData): RGB[] {
    const { data, width, height } = imageData;
    const pixels: RGB[] = [];

    // サンプリング率を動的に調整
    const totalPixels = width * height;
    const maxSamples = 8000;
    const step = Math.max(1, Math.floor(totalPixels / maxSamples));

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];

      if (alpha < 128) continue;

      pixels.push({ r, g, b });
    }

    return pixels;
  }

  private medianCut(pixels: RGB[], maxColors: number): ColorBox[] {
    const initialBox: ColorBox = {
      colors: pixels,
      ...this.getBounds(pixels),
    };

    const boxes: ColorBox[] = [initialBox];

    while (boxes.length < maxColors) {
      // 最大の範囲を持つボックスを選択
      const largestBox = this.findLargestBox(boxes);
      if (!largestBox) break;

      // ボックスを分割
      const [box1, box2] = this.splitBox(largestBox);

      // 元のボックスを削除し、新しいボックスを追加
      const index = boxes.indexOf(largestBox);
      boxes.splice(index, 1, box1, box2);
    }

    return boxes.filter((box) => box.colors.length > 0);
  }

  private getBounds(colors: RGB[]): Omit<ColorBox, 'colors'> {
    let minR = 255,
      maxR = 0;
    let minG = 255,
      maxG = 0;
    let minB = 255,
      maxB = 0;

    for (const color of colors) {
      minR = Math.min(minR, color.r);
      maxR = Math.max(maxR, color.r);
      minG = Math.min(minG, color.g);
      maxG = Math.max(maxG, color.g);
      minB = Math.min(minB, color.b);
      maxB = Math.max(maxB, color.b);
    }

    return { minR, maxR, minG, maxG, minB, maxB };
  }

  private findLargestBox(boxes: ColorBox[]): ColorBox | null {
    let largestBox: ColorBox | null = null;
    let largestRange = 0;

    for (const box of boxes) {
      if (box.colors.length <= 1) continue;

      const rRange = box.maxR - box.minR;
      const gRange = box.maxG - box.minG;
      const bRange = box.maxB - box.minB;
      const totalRange = rRange + gRange + bRange;

      if (totalRange > largestRange) {
        largestRange = totalRange;
        largestBox = box;
      }
    }

    return largestBox;
  }

  private splitBox(box: ColorBox): [ColorBox, ColorBox] {
    const { colors } = box;

    // 最大の範囲を持つチャンネルを決定
    const rRange = box.maxR - box.minR;
    const gRange = box.maxG - box.minG;
    const bRange = box.maxB - box.minB;

    let sortKey: keyof RGB;
    if (rRange >= gRange && rRange >= bRange) {
      sortKey = 'r';
    } else if (gRange >= bRange) {
      sortKey = 'g';
    } else {
      sortKey = 'b';
    }

    // 選択されたチャンネルでソート
    const sortedColors = [...colors].sort((a, b) => a[sortKey] - b[sortKey]);

    // 中央値で分割
    const midIndex = Math.floor(sortedColors.length / 2);
    const colors1 = sortedColors.slice(0, midIndex);
    const colors2 = sortedColors.slice(midIndex);

    const box1: ColorBox = {
      colors: colors1,
      ...this.getBounds(colors1),
    };

    const box2: ColorBox = {
      colors: colors2,
      ...this.getBounds(colors2),
    };

    return [box1, box2];
  }

  private getAverageColor(colors: RGB[]): RGB {
    if (colors.length === 0) return { r: 0, g: 0, b: 0 };

    const sum = colors.reduce(
      (acc, color) => ({
        r: acc.r + color.r,
        g: acc.g + color.g,
        b: acc.b + color.b,
      }),
      { r: 0, g: 0, b: 0 }
    );

    return {
      r: Math.round(sum.r / colors.length),
      g: Math.round(sum.g / colors.length),
      b: Math.round(sum.b / colors.length),
    };
  }
}
