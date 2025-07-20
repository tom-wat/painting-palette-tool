/**
 * 色空間変換のパフォーマンスベンチマーク
 */

import { bench, describe } from 'vitest';
import {
  ColorSpaceConverter,
  SRGBToLinearConverter,
  LinearRGBToXYZConverter,
  XYZToLABConverter,
  DeltaECalculator,
  type SRGBColor,
  type LABColor,
} from '../src/color-space-conversion.js';

// テストデータ生成
function generateTestColors(count: number): SRGBColor[] {
  return Array.from({ length: count }, (_, i) => ({
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  }));
}

function generateTestLABColors(count: number): LABColor[] {
  return Array.from({ length: count }, () => ({
    l: Math.random() * 100,
    a: (Math.random() - 0.5) * 256,
    b: (Math.random() - 0.5) * 256,
  }));
}

function generateImageData(width: number, height: number): ImageData {
  const imageData = new ImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.floor(Math.random() * 256); // R
    imageData.data[i + 1] = Math.floor(Math.random() * 256); // G
    imageData.data[i + 2] = Math.floor(Math.random() * 256); // B
    imageData.data[i + 3] = 255; // A
  }
  return imageData;
}

// ベンチマーク設定
const smallColorSet = generateTestColors(100);
const mediumColorSet = generateTestColors(1000);
const largeColorSet = generateTestColors(10000);

const smallLABSet = generateTestLABColors(100);
const mediumLABSet = generateTestLABColors(1000);

const smallImageData = generateImageData(64, 64); // 4K pixels
const mediumImageData = generateImageData(128, 128); // 16K pixels
const largeImageData = generateImageData(256, 256); // 65K pixels

describe('sRGB → Linear RGB 変換', () => {
  const converter = new SRGBToLinearConverter();

  bench('100色変換', () => {
    smallColorSet.forEach((color) => converter.convert(color));
  });

  bench('1000色変換', () => {
    mediumColorSet.forEach((color) => converter.convert(color));
  });

  bench('10000色変換', () => {
    largeColorSet.forEach((color) => converter.convert(color));
  });

  bench('バッチ変換 (100色)', () => {
    const data = new Uint8Array(smallColorSet.length * 3);
    let index = 0;
    for (const color of smallColorSet) {
      data[index++] = color.r;
      data[index++] = color.g;
      data[index++] = color.b;
    }
    converter.convertBatch(data);
  });
});

describe('Linear RGB → XYZ 変換', () => {
  const srgbConverter = new SRGBToLinearConverter();
  const xyzConverter = new LinearRGBToXYZConverter();
  const linearColors = smallColorSet.map((color) =>
    srgbConverter.convert(color)
  );

  bench('100色変換', () => {
    linearColors.forEach((color) => xyzConverter.convert(color));
  });

  bench('バッチ変換 (100色)', () => {
    const data = new Float32Array(linearColors.length * 3);
    let index = 0;
    for (const color of linearColors) {
      data[index++] = color.r;
      data[index++] = color.g;
      data[index++] = color.b;
    }
    xyzConverter.convertBatch(data);
  });
});

describe('XYZ → LAB 変換', () => {
  const converter = new ColorSpaceConverter();
  const xyzConverter = new XYZToLABConverter();
  const xyzColors = smallColorSet.map((color) => converter.srgbToXyz(color));

  bench('100色変換', () => {
    xyzColors.forEach((color) => xyzConverter.convert(color));
  });

  bench('バッチ変換 (100色)', () => {
    const data = new Float32Array(xyzColors.length * 3);
    let index = 0;
    for (const color of xyzColors) {
      data[index++] = color.x;
      data[index++] = color.y;
      data[index++] = color.z;
    }
    xyzConverter.convertBatch(data);
  });
});

describe('包括的色空間変換', () => {
  const converter = new ColorSpaceConverter();

  bench('sRGB → LAB (100色)', () => {
    smallColorSet.forEach((color) => converter.srgbToLab(color));
  });

  bench('sRGB → LAB (1000色)', () => {
    mediumColorSet.forEach((color) => converter.srgbToLab(color));
  });

  bench('LAB → sRGB (100色)', () => {
    const labColors = smallColorSet.map((color) => converter.srgbToLab(color));
    labColors.forEach((color) => converter.labToSrgb(color));
  });

  bench('sRGB → XYZ (100色)', () => {
    smallColorSet.forEach((color) => converter.srgbToXyz(color));
  });

  bench('XYZ → sRGB (100色)', () => {
    const xyzColors = smallColorSet.map((color) => converter.srgbToXyz(color));
    xyzColors.forEach((color) => converter.xyzToSrgb(color));
  });
});

describe('ImageData バッチ変換', () => {
  const converter = new ColorSpaceConverter();

  bench('64×64画像 (4K pixels)', () => {
    converter.convertImageDataToLab(smallImageData);
  });

  bench('128×128画像 (16K pixels)', () => {
    converter.convertImageDataToLab(mediumImageData);
  });

  bench('256×256画像 (65K pixels)', () => {
    converter.convertImageDataToLab(largeImageData);
  });
});

describe('デルタE計算', () => {
  const calculator = new DeltaECalculator();
  const converter = new ColorSpaceConverter();

  const labColors1 = smallLABSet;
  const labColors2 = generateTestLABColors(100);

  bench('CIE76 デルタE (100ペア)', () => {
    for (let i = 0; i < labColors1.length; i++) {
      calculator.calculateCIE76(labColors1[i]!, labColors2[i]!);
    }
  });

  bench('CIE94 デルタE (100ペア)', () => {
    for (let i = 0; i < labColors1.length; i++) {
      calculator.calculateCIE94(labColors1[i]!, labColors2[i]!);
    }
  });

  bench('CIEDE2000 デルタE (100ペア)', () => {
    for (let i = 0; i < labColors1.length; i++) {
      calculator.calculateCIEDE2000(labColors1[i]!, labColors2[i]!);
    }
  });

  bench('sRGB デルタE (CIE76) (100ペア)', () => {
    for (let i = 0; i < smallColorSet.length && i < 100; i++) {
      const color1 = smallColorSet[i]!;
      const color2 = smallColorSet[(i + 1) % smallColorSet.length]!;
      converter.calculateDeltaE(color1, color2, 'CIE76');
    }
  });

  bench('sRGB デルタE (CIEDE2000) (100ペア)', () => {
    for (let i = 0; i < smallColorSet.length && i < 100; i++) {
      const color1 = smallColorSet[i]!;
      const color2 = smallColorSet[(i + 1) % smallColorSet.length]!;
      converter.calculateDeltaE(color1, color2, 'CIEDE2000');
    }
  });
});

describe('ガンマ補正', () => {
  const converter = new ColorSpaceConverter();

  bench('ガンマ補正テスト実行', () => {
    converter.testGammaCorrection();
  });
});

describe('ラウンドトリップ変換', () => {
  const converter = new ColorSpaceConverter();

  bench('sRGB → LAB → sRGB (100色)', () => {
    smallColorSet.forEach((color) => {
      const lab = converter.srgbToLab(color);
      converter.labToSrgb(lab);
    });
  });

  bench('sRGB → XYZ → sRGB (100色)', () => {
    smallColorSet.forEach((color) => {
      const xyz = converter.srgbToXyz(color);
      converter.xyzToSrgb(xyz);
    });
  });
});

describe('スケーラビリティテスト', () => {
  const converter = new ColorSpaceConverter();

  bench('sRGB → LAB 極大セット (10000色)', () => {
    largeColorSet.forEach((color) => converter.srgbToLab(color));
  });

  bench('CIEDE2000 極大セット (1000ペア)', () => {
    const calculator = new DeltaECalculator();
    const labColors = mediumColorSet.map((color) => converter.srgbToLab(color));

    for (let i = 0; i < 1000 && i < labColors.length - 1; i++) {
      calculator.calculateCIEDE2000(labColors[i]!, labColors[i + 1]!);
    }
  });
});
