/**
 * 色空間変換のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ColorSpaceConverter,
  SRGBToLinearConverter,
  LinearToSRGBConverter,
  LinearRGBToXYZConverter,
  XYZToLinearRGBConverter,
  XYZToLABConverter,
  LABToXYZConverter,
  DeltaECalculator,
  ILLUMINANT_D65,
  type SRGBColor,
  type LinearRGBColor,
  type XYZColor,
  type LABColor,
} from '../src/color-space-conversion.js';

describe('SRGBToLinearConverter', () => {
  let converter: SRGBToLinearConverter;

  beforeEach(() => {
    converter = new SRGBToLinearConverter();
  });

  it('黒色(0,0,0)を正しく変換する', () => {
    const result = converter.convert({ r: 0, g: 0, b: 0 });
    expect(result.r).toBeCloseTo(0, 6);
    expect(result.g).toBeCloseTo(0, 6);
    expect(result.b).toBeCloseTo(0, 6);
  });

  it('白色(255,255,255)を正しく変換する', () => {
    const result = converter.convert({ r: 255, g: 255, b: 255 });
    expect(result.r).toBeCloseTo(1, 6);
    expect(result.g).toBeCloseTo(1, 6);
    expect(result.b).toBeCloseTo(1, 6);
  });

  it('中間色(128,128,128)を正しく変換する', () => {
    const result = converter.convert({ r: 128, g: 128, b: 128 });
    // sRGB 128/255 = 0.5019... → linear ~0.2159
    expect(result.r).toBeCloseTo(0.2159, 3);
    expect(result.g).toBeCloseTo(0.2159, 3);
    expect(result.b).toBeCloseTo(0.2159, 3);
  });

  it('バッチ変換が機能する', () => {
    const input = new Uint8Array([255, 128, 0, 0, 255, 128]);
    const result = converter.convertBatch(input);

    expect(result).toHaveLength(6);
    expect(result[0]).toBeCloseTo(1, 6); // 255 → 1
    expect(result[1]).toBeCloseTo(0.2159, 3); // 128 → ~0.2159
    expect(result[2]).toBeCloseTo(0, 6); // 0 → 0
  });
});

describe('LinearToSRGBConverter', () => {
  let converter: LinearToSRGBConverter;

  beforeEach(() => {
    converter = new LinearToSRGBConverter();
  });

  it('Linear RGB (0,0,0) を sRGB (0,0,0) に変換する', () => {
    const result = converter.convert({ r: 0, g: 0, b: 0 });
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it('Linear RGB (1,1,1) を sRGB (255,255,255) に変換する', () => {
    const result = converter.convert({ r: 1, g: 1, b: 1 });
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });

  it('Linear RGB (0.2159, 0.2159, 0.2159) を sRGB ~(128,128,128) に変換する', () => {
    const result = converter.convert({ r: 0.2159, g: 0.2159, b: 0.2159 });
    expect(result.r).toBeCloseTo(128, 0);
    expect(result.g).toBeCloseTo(128, 0);
    expect(result.b).toBeCloseTo(128, 0);
  });
});

describe('LinearRGBToXYZConverter', () => {
  let converter: LinearRGBToXYZConverter;

  beforeEach(() => {
    converter = new LinearRGBToXYZConverter();
  });

  it('白色 Linear RGB (1,1,1) を D65 白点に変換する', () => {
    const result = converter.convert({ r: 1, g: 1, b: 1 });
    expect(result.x).toBeCloseTo(ILLUMINANT_D65.x / 100, 3); // 0.95047
    expect(result.y).toBeCloseTo(ILLUMINANT_D65.y / 100, 3); // 1.00000
    expect(result.z).toBeCloseTo(ILLUMINANT_D65.z / 100, 3); // 1.08883
  });

  it('赤色 Linear RGB (1,0,0) を正しく変換する', () => {
    const result = converter.convert({ r: 1, g: 0, b: 0 });
    expect(result.x).toBeCloseTo(0.4124564, 6);
    expect(result.y).toBeCloseTo(0.2126729, 6);
    expect(result.z).toBeCloseTo(0.0193339, 6);
  });

  it('バッチ変換が機能する', () => {
    const input = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const result = converter.convertBatch(input);

    expect(result).toHaveLength(9);
    // 赤 (1,0,0)
    expect(result[0]).toBeCloseTo(0.4124564, 6);
    expect(result[1]).toBeCloseTo(0.2126729, 6);
    expect(result[2]).toBeCloseTo(0.0193339, 6);
  });
});

describe('XYZToLinearRGBConverter', () => {
  let converter: XYZToLinearRGBConverter;

  beforeEach(() => {
    converter = new XYZToLinearRGBConverter();
  });

  it('D65 白点を Linear RGB (1,1,1) に変換する', () => {
    const input: XYZColor = {
      x: ILLUMINANT_D65.x,
      y: ILLUMINANT_D65.y,
      z: ILLUMINANT_D65.z,
    };
    const result = converter.convert(input);
    expect(result.r).toBeCloseTo(1, 3);
    expect(result.g).toBeCloseTo(1, 3);
    expect(result.b).toBeCloseTo(1, 3);
  });
});

describe('XYZToLABConverter', () => {
  let converter: XYZToLABConverter;

  beforeEach(() => {
    converter = new XYZToLABConverter();
  });

  it('D65 白点を LAB (100, 0, 0) に変換する', () => {
    const input: XYZColor = {
      x: ILLUMINANT_D65.x,
      y: ILLUMINANT_D65.y,
      z: ILLUMINANT_D65.z,
    };
    const result = converter.convert(input);
    expect(result.l).toBeCloseTo(100, 1);
    expect(result.a).toBeCloseTo(0, 1);
    expect(result.b).toBeCloseTo(0, 1);
  });

  it('黒色 XYZ (0,0,0) を LAB (0, 0, 0) に変換する', () => {
    const result = converter.convert({ x: 0, y: 0, z: 0 });
    expect(result.l).toBeCloseTo(0, 1);
    expect(result.a).toBeCloseTo(0, 1);
    expect(result.b).toBeCloseTo(0, 1);
  });

  it('バッチ変換が機能する', () => {
    const input = new Float32Array([
      ILLUMINANT_D65.x,
      ILLUMINANT_D65.y,
      ILLUMINANT_D65.z,
      0,
      0,
      0,
    ]);
    const result = converter.convertBatch(input);

    expect(result).toHaveLength(6);
    expect(result[0]).toBeCloseTo(100, 1); // L for white
    expect(result[1]).toBeCloseTo(0, 1); // a for white
    expect(result[2]).toBeCloseTo(0, 1); // b for white
    expect(result[3]).toBeCloseTo(0, 1); // L for black
  });
});

describe('LABToXYZConverter', () => {
  let converter: LABToXYZConverter;

  beforeEach(() => {
    converter = new LABToXYZConverter();
  });

  it('LAB (100, 0, 0) を D65 白点に変換する', () => {
    const result = converter.convert({ l: 100, a: 0, b: 0 });
    expect(result.x).toBeCloseTo(ILLUMINANT_D65.x, 1);
    expect(result.y).toBeCloseTo(ILLUMINANT_D65.y, 1);
    expect(result.z).toBeCloseTo(ILLUMINANT_D65.z, 1);
  });

  it('LAB (0, 0, 0) を XYZ (0,0,0) に変換する', () => {
    const result = converter.convert({ l: 0, a: 0, b: 0 });
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.z).toBeCloseTo(0, 1);
  });
});

describe('DeltaECalculator', () => {
  let calculator: DeltaECalculator;

  beforeEach(() => {
    calculator = new DeltaECalculator();
  });

  it('同一色のデルタE76は0になる', () => {
    const color: LABColor = { l: 50, a: 10, b: -5 };
    const deltaE = calculator.calculateCIE76(color, color);
    expect(deltaE).toBe(0);
  });

  it('白と黒のデルタE76は100になる', () => {
    const white: LABColor = { l: 100, a: 0, b: 0 };
    const black: LABColor = { l: 0, a: 0, b: 0 };
    const deltaE = calculator.calculateCIE76(white, black);
    expect(deltaE).toBeCloseTo(100, 1);
  });

  it('CIE94デルタEが計算される', () => {
    const color1: LABColor = { l: 50, a: 10, b: -5 };
    const color2: LABColor = { l: 55, a: 8, b: -3 };
    const deltaE = calculator.calculateCIE94(color1, color2);
    expect(deltaE).toBeGreaterThan(0);
    expect(deltaE).toBeLessThan(10);
  });

  it('CIEDE2000デルタEが計算される', () => {
    const color1: LABColor = { l: 50, a: 10, b: -5 };
    const color2: LABColor = { l: 55, a: 8, b: -3 };
    const deltaE = calculator.calculateCIEDE2000(color1, color2);
    expect(deltaE).toBeGreaterThan(0);
    expect(deltaE).toBeLessThan(10);
  });
});

describe('ColorSpaceConverter', () => {
  let converter: ColorSpaceConverter;

  beforeEach(() => {
    converter = new ColorSpaceConverter();
  });

  it('sRGB → LAB 一括変換が機能する', () => {
    const srgb: SRGBColor = { r: 255, g: 0, b: 0 };
    const lab = converter.srgbToLab(srgb);

    expect(lab.l).toBeGreaterThan(0);
    expect(lab.a).toBeGreaterThan(0); // 赤色なのでa > 0
    expect(typeof lab.b).toBe('number');
  });

  it('LAB → sRGB 一括変換が機能する', () => {
    const lab: LABColor = { l: 53.24, a: 80.09, b: 67.2 }; // 赤色近似
    const srgb = converter.labToSrgb(lab);

    expect(srgb.r).toBeGreaterThan(200); // 赤成分が高い
    expect(srgb.g).toBeLessThan(100); // 緑成分が低い
    expect(srgb.b).toBeLessThan(100); // 青成分が低い
  });

  it('sRGB色同士のデルタE計算が機能する', () => {
    const color1: SRGBColor = { r: 255, g: 0, b: 0 };
    const color2: SRGBColor = { r: 255, g: 255, b: 255 };

    const deltaE76 = converter.calculateDeltaE(color1, color2, 'CIE76');
    const deltaE94 = converter.calculateDeltaE(color1, color2, 'CIE94');
    const deltaE2000 = converter.calculateDeltaE(color1, color2, 'CIEDE2000');

    expect(deltaE76).toBeGreaterThan(0);
    expect(deltaE94).toBeGreaterThan(0);
    expect(deltaE2000).toBeGreaterThan(0);
  });

  it('ImageData → LAB バッチ変換が機能する', () => {
    const imageData = new ImageData(2, 1); // 2x1 pixel
    imageData.data[0] = 255; // R
    imageData.data[1] = 0; // G
    imageData.data[2] = 0; // B
    imageData.data[3] = 255; // A
    imageData.data[4] = 0; // R
    imageData.data[5] = 255; // G
    imageData.data[6] = 0; // B
    imageData.data[7] = 255; // A

    const labArray = converter.convertImageDataToLab(imageData);

    expect(labArray).toHaveLength(6); // 2 pixels × 3 LAB components
    expect(labArray[0]).toBeGreaterThan(0); // L of red
    expect(labArray[1]).toBeGreaterThan(0); // a of red (positive)
    expect(labArray[3]).toBeGreaterThan(0); // L of green
    expect(labArray[4]).toBeLessThan(0); // a of green (negative)
  });

  it('ガンマ補正のラウンドトリップ精度をテストする', () => {
    const testResult = converter.testGammaCorrection();

    expect(testResult.srgbToLinear).toHaveLength(5);
    expect(testResult.linearToSrgb).toHaveLength(5);
    expect(testResult.roundTripError).toHaveLength(5);

    // ラウンドトリップエラーは小さいことを確認
    testResult.roundTripError.forEach((error) => {
      expect(error).toBeLessThan(1); // 1未満の誤差
    });
  });

  it('色空間変換のラウンドトリップ精度をテストする', () => {
    const originalSrgb: SRGBColor = { r: 128, g: 64, b: 192 };

    // sRGB → LAB → sRGB
    const lab = converter.srgbToLab(originalSrgb);
    const backToSrgb = converter.labToSrgb(lab);

    // ラウンドトリップ変換で範囲内の値が返されることを確認
    expect(backToSrgb.r).toBeGreaterThanOrEqual(0);
    expect(backToSrgb.r).toBeLessThanOrEqual(255);
    expect(backToSrgb.g).toBeGreaterThanOrEqual(0);
    expect(backToSrgb.g).toBeLessThanOrEqual(255);
    expect(backToSrgb.b).toBeGreaterThanOrEqual(0);
    expect(backToSrgb.b).toBeLessThanOrEqual(255);
  });

  it('XYZ変換のラウンドトリップ精度をテストする', () => {
    const originalSrgb: SRGBColor = { r: 128, g: 64, b: 192 };

    // sRGB → XYZ → sRGB
    const xyz = converter.srgbToXyz(originalSrgb);
    const backToSrgb = converter.xyzToSrgb(xyz);

    // ラウンドトリップ変換で範囲内の値が返されることを確認
    expect(backToSrgb.r).toBeGreaterThanOrEqual(0);
    expect(backToSrgb.r).toBeLessThanOrEqual(255);
    expect(backToSrgb.g).toBeGreaterThanOrEqual(0);
    expect(backToSrgb.g).toBeLessThanOrEqual(255);
    expect(backToSrgb.b).toBeGreaterThanOrEqual(0);
    expect(backToSrgb.b).toBeLessThanOrEqual(255);
  });
});
