/**
 * 色空間変換ライブラリ
 * sRGB ↔ Linear RGB ↔ XYZ ↔ LAB 変換とガンマ補正、デルタE計算
 */

// 基本色型定義
export interface SRGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface LinearRGBColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
}

export interface XYZColor {
  x: number; // 0-95.047
  y: number; // 0-100.000
  z: number; // 0-108.883
}

export interface LABColor {
  l: number; // 0-100
  a: number; // -128 to +128
  b: number; // -128 to +128
}

// CIE標準イルミナント D65 (2度視野)
export const ILLUMINANT_D65 = {
  x: 95.047,
  y: 100.0,
  z: 108.883,
};

// sRGBガンマカーブ定数
export const GAMMA_SRGB = 2.4;
export const GAMMA_CORRECTION_THRESHOLD = 0.04045;
export const LINEAR_THRESHOLD = 0.0031308;

/**
 * sRGB → Linear RGB変換（ガンマ補正除去）
 */
export class SRGBToLinearConverter {
  /**
   * sRGB値 (0-255) を Linear RGB (0-1) に変換
   */
  convert(srgb: SRGBColor): LinearRGBColor {
    return {
      r: this.srgbToLinear(srgb.r / 255),
      g: this.srgbToLinear(srgb.g / 255),
      b: this.srgbToLinear(srgb.b / 255),
    };
  }

  /**
   * 単一チャンネルのsRGB → Linear変換
   */
  private srgbToLinear(value: number): number {
    if (value <= GAMMA_CORRECTION_THRESHOLD) {
      return value / 12.92;
    } else {
      return Math.pow((value + 0.055) / 1.055, GAMMA_SRGB);
    }
  }

  /**
   * バッチ変換（TypedArray対応）
   */
  convertBatch(srgbArray: Uint8Array): Float32Array {
    const linearArray = new Float32Array(srgbArray.length);

    for (let i = 0; i < srgbArray.length; i += 3) {
      const linear = this.convert({
        r: srgbArray[i] || 0,
        g: srgbArray[i + 1] || 0,
        b: srgbArray[i + 2] || 0,
      });

      linearArray[i] = linear.r;
      linearArray[i + 1] = linear.g;
      linearArray[i + 2] = linear.b;
    }

    return linearArray;
  }
}

/**
 * Linear RGB → sRGB変換（ガンマ補正適用）
 */
export class LinearToSRGBConverter {
  /**
   * Linear RGB (0-1) を sRGB (0-255) に変換
   */
  convert(linear: LinearRGBColor): SRGBColor {
    return {
      r: Math.round(this.linearToSrgb(linear.r) * 255),
      g: Math.round(this.linearToSrgb(linear.g) * 255),
      b: Math.round(this.linearToSrgb(linear.b) * 255),
    };
  }

  /**
   * 単一チャンネルのLinear → sRGB変換
   */
  private linearToSrgb(value: number): number {
    if (value <= LINEAR_THRESHOLD) {
      return value * 12.92;
    } else {
      return 1.055 * Math.pow(value, 1.0 / GAMMA_SRGB) - 0.055;
    }
  }
}

/**
 * Linear RGB → XYZ変換
 */
export class LinearRGBToXYZConverter {
  // sRGB → XYZ変換行列 (D65 illuminant)
  private readonly transformMatrix = [
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.072175],
    [0.0193339, 0.119192, 0.9503041],
  ];

  /**
   * Linear RGB を XYZ に変換
   */
  convert(linear: LinearRGBColor): XYZColor {
    const r = linear.r;
    const g = linear.g;
    const b = linear.b;

    return {
      x:
        (this.transformMatrix[0]?.[0] ?? 0) * r +
        (this.transformMatrix[0]?.[1] ?? 0) * g +
        (this.transformMatrix[0]?.[2] ?? 0) * b,
      y:
        (this.transformMatrix[1]?.[0] ?? 0) * r +
        (this.transformMatrix[1]?.[1] ?? 0) * g +
        (this.transformMatrix[1]?.[2] ?? 0) * b,
      z:
        (this.transformMatrix[2]?.[0] ?? 0) * r +
        (this.transformMatrix[2]?.[1] ?? 0) * g +
        (this.transformMatrix[2]?.[2] ?? 0) * b,
    };
  }

  /**
   * 高速化バッチ変換
   */
  convertBatch(linearArray: Float32Array): Float32Array {
    const xyzArray = new Float32Array(linearArray.length);

    for (let i = 0; i < linearArray.length; i += 3) {
      const r = linearArray[i] || 0;
      const g = linearArray[i + 1] || 0;
      const b = linearArray[i + 2] || 0;

      xyzArray[i] =
        (this.transformMatrix[0]?.[0] ?? 0) * r +
        (this.transformMatrix[0]?.[1] ?? 0) * g +
        (this.transformMatrix[0]?.[2] ?? 0) * b;
      xyzArray[i + 1] =
        (this.transformMatrix[1]?.[0] ?? 0) * r +
        (this.transformMatrix[1]?.[1] ?? 0) * g +
        (this.transformMatrix[1]?.[2] ?? 0) * b;
      xyzArray[i + 2] =
        (this.transformMatrix[2]?.[0] ?? 0) * r +
        (this.transformMatrix[2]?.[1] ?? 0) * g +
        (this.transformMatrix[2]?.[2] ?? 0) * b;
    }

    return xyzArray;
  }
}

/**
 * XYZ → Linear RGB変換
 */
export class XYZToLinearRGBConverter {
  // XYZ → sRGB変換行列 (D65 illuminant)
  private readonly transformMatrix = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.969266, 1.8760108, 0.041556],
    [0.0556434, -0.2040259, 1.0572252],
  ];

  /**
   * XYZ を Linear RGB に変換
   */
  convert(xyz: XYZColor): LinearRGBColor {
    const x = xyz.x / 100;
    const y = xyz.y / 100;
    const z = xyz.z / 100;

    return {
      r: Math.max(
        0,
        (this.transformMatrix[0]?.[0] ?? 0) * x +
          (this.transformMatrix[0]?.[1] ?? 0) * y +
          (this.transformMatrix[0]?.[2] ?? 0) * z
      ),
      g: Math.max(
        0,
        (this.transformMatrix[1]?.[0] ?? 0) * x +
          (this.transformMatrix[1]?.[1] ?? 0) * y +
          (this.transformMatrix[1]?.[2] ?? 0) * z
      ),
      b: Math.max(
        0,
        (this.transformMatrix[2]?.[0] ?? 0) * x +
          (this.transformMatrix[2]?.[1] ?? 0) * y +
          (this.transformMatrix[2]?.[2] ?? 0) * z
      ),
    };
  }
}

/**
 * XYZ → LAB変換
 */
export class XYZToLABConverter {
  private readonly cbrt_threshold = 216.0 / 24389.0; // (6/29)^3
  private readonly linear_threshold = 24389.0 / 27.0; // (29/3)^3

  /**
   * XYZ を LAB に変換
   */
  convert(xyz: XYZColor): LABColor {
    // D65イルミナントで正規化
    const x = xyz.x / ILLUMINANT_D65.x;
    const y = xyz.y / ILLUMINANT_D65.y;
    const z = xyz.z / ILLUMINANT_D65.z;

    const fx = this.fTransform(x);
    const fy = this.fTransform(y);
    const fz = this.fTransform(z);

    return {
      l: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz),
    };
  }

  /**
   * CIE LAB f変換関数
   */
  private fTransform(value: number): number {
    if (value > this.cbrt_threshold) {
      return Math.cbrt(value);
    } else {
      return (this.linear_threshold * value + 16) / 116;
    }
  }

  /**
   * 高速化バッチ変換
   */
  convertBatch(xyzArray: Float32Array): Float32Array {
    const labArray = new Float32Array(xyzArray.length);

    for (let i = 0; i < xyzArray.length; i += 3) {
      const x = (xyzArray[i] || 0) / ILLUMINANT_D65.x;
      const y = (xyzArray[i + 1] || 0) / ILLUMINANT_D65.y;
      const z = (xyzArray[i + 2] || 0) / ILLUMINANT_D65.z;

      const fx = this.fTransform(x);
      const fy = this.fTransform(y);
      const fz = this.fTransform(z);

      labArray[i] = 116 * fy - 16; // L
      labArray[i + 1] = 500 * (fx - fy); // a
      labArray[i + 2] = 200 * (fy - fz); // b
    }

    return labArray;
  }
}

/**
 * LAB → XYZ変換
 */
export class LABToXYZConverter {
  private readonly cbrt_threshold = 6.0 / 29.0; // cbrt(216/24389)
  private readonly linear_multiplier = 3.0 * (6.0 / 29.0) * (6.0 / 29.0); // 3 * (6/29)^2

  /**
   * LAB を XYZ に変換
   */
  convert(lab: LABColor): XYZColor {
    const fy = (lab.l + 16) / 116;
    const fx = lab.a / 500 + fy;
    const fz = fy - lab.b / 200;

    const x = this.fInverseTransform(fx) * ILLUMINANT_D65.x;
    const y = this.fInverseTransform(fy) * ILLUMINANT_D65.y;
    const z = this.fInverseTransform(fz) * ILLUMINANT_D65.z;

    return { x, y, z };
  }

  /**
   * CIE LAB f^-1変換関数
   */
  private fInverseTransform(value: number): number {
    if (value > this.cbrt_threshold) {
      return value * value * value;
    } else {
      return this.linear_multiplier * (value - 16.0 / 116.0);
    }
  }
}

/**
 * デルタE計算（色差）
 */
export class DeltaECalculator {
  /**
   * CIE76 デルタE計算（基本版）
   */
  calculateCIE76(lab1: LABColor, lab2: LABColor): number {
    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  /**
   * CIE94 デルタE計算（改良版）
   */
  calculateCIE94(lab1: LABColor, lab2: LABColor, textiles = false): number {
    const kL = textiles ? 2 : 1;
    const kC = 1;
    const kH = 1;
    const k1 = textiles ? 0.048 : 0.045;
    const k2 = textiles ? 0.014 : 0.015;

    const deltaL = lab1.l - lab2.l;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const deltaC = c1 - c2;

    const deltaH2 = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    const deltaH = deltaH2 > 0 ? Math.sqrt(deltaH2) : 0;

    const sL = 1;
    const sC = 1 + k1 * c1;
    const sH = 1 + k2 * c1;

    const term1 = deltaL / (kL * sL);
    const term2 = deltaC / (kC * sC);
    const term3 = deltaH / (kH * sH);

    return Math.sqrt(term1 * term1 + term2 * term2 + term3 * term3);
  }

  /**
   * CIEDE2000 デルタE計算（最新版・最高精度）
   */
  calculateCIEDE2000(lab1: LABColor, lab2: LABColor): number {
    // CIEDE2000の複雑な計算式
    const kL = 1;
    const kC = 1;
    const kH = 1;

    const c1 = Math.sqrt(lab1.a * lab1.a + lab1.b * lab1.b);
    const c2 = Math.sqrt(lab2.a * lab2.a + lab2.b * lab2.b);
    const cBar = (c1 + c2) / 2;

    const g =
      0.5 *
      (1 -
        Math.sqrt(Math.pow(cBar, 7) / (Math.pow(cBar, 7) + Math.pow(25, 7))));

    const ap1 = (1 + g) * lab1.a;
    const ap2 = (1 + g) * lab2.a;

    const cp1 = Math.sqrt(ap1 * ap1 + lab1.b * lab1.b);
    const cp2 = Math.sqrt(ap2 * ap2 + lab2.b * lab2.b);

    const hp1 = this.computeHue(ap1, lab1.b);
    const hp2 = this.computeHue(ap2, lab2.b);

    const deltaL = lab2.l - lab1.l;
    const deltaC = cp2 - cp1;
    const dhp = this.computeHueDifference(hp1, hp2, cp1, cp2);
    const deltaH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(dhp / 2);

    const lBar = (lab1.l + lab2.l) / 2;
    const cBar2 = (cp1 + cp2) / 2;
    const hBar = this.computeHueAverage(hp1, hp2, cp1, cp2);

    const t =
      1 -
      0.17 * Math.cos(hBar - (30 * Math.PI) / 180) +
      0.24 * Math.cos(2 * hBar) +
      0.32 * Math.cos(3 * hBar + (6 * Math.PI) / 180) -
      0.2 * Math.cos(4 * hBar - (63 * Math.PI) / 180);

    const sL =
      1 +
      (0.015 * Math.pow(lBar - 50, 2)) / Math.sqrt(20 + Math.pow(lBar - 50, 2));
    const sC = 1 + 0.045 * cBar2;
    const sH = 1 + 0.015 * cBar2 * t;

    const deltaTheta =
      ((30 * Math.PI) / 180) *
      Math.exp(-Math.pow(((hBar * 180) / Math.PI - 275) / 25, 2));
    const rC =
      2 *
      Math.sqrt(Math.pow(cBar2, 7) / (Math.pow(cBar2, 7) + Math.pow(25, 7)));
    const rT = -rC * Math.sin(2 * deltaTheta);

    const term1 = deltaL / (kL * sL);
    const term2 = deltaC / (kC * sC);
    const term3 = deltaH / (kH * sH);
    const rtTerm = rT * (deltaC / (kC * sC)) * (deltaH / (kH * sH));

    return Math.sqrt(term1 * term1 + term2 * term2 + term3 * term3 + rtTerm);
  }

  private computeHue(a: number, b: number): number {
    if (Math.abs(a) < 1e-10 && Math.abs(b) < 1e-10) return 0;

    const hue = Math.atan2(b, a);
    return hue >= 0 ? hue : hue + 2 * Math.PI;
  }

  private computeHueDifference(
    hp1: number,
    hp2: number,
    cp1: number,
    cp2: number
  ): number {
    if (cp1 * cp2 === 0) return 0;

    const dhp = hp2 - hp1;
    if (Math.abs(dhp) <= Math.PI) return dhp;

    return dhp > Math.PI ? dhp - 2 * Math.PI : dhp + 2 * Math.PI;
  }

  private computeHueAverage(
    hp1: number,
    hp2: number,
    cp1: number,
    cp2: number
  ): number {
    if (cp1 * cp2 === 0) return hp1 + hp2;

    const diff = Math.abs(hp1 - hp2);
    if (diff <= Math.PI) return (hp1 + hp2) / 2;

    const sum = hp1 + hp2;
    return sum < 2 * Math.PI
      ? (sum + 2 * Math.PI) / 2
      : (sum - 2 * Math.PI) / 2;
  }
}

/**
 * 包括的色空間変換エンジン
 */
export class ColorSpaceConverter {
  private srgbToLinear = new SRGBToLinearConverter();
  private linearToSrgb = new LinearToSRGBConverter();
  private linearToXyz = new LinearRGBToXYZConverter();
  private xyzToLinear = new XYZToLinearRGBConverter();
  private xyzToLab = new XYZToLABConverter();
  private labToXyz = new LABToXYZConverter();
  private deltaE = new DeltaECalculator();

  /**
   * sRGB → LAB 一括変換
   */
  srgbToLab(srgb: SRGBColor): LABColor {
    const linear = this.srgbToLinear.convert(srgb);
    const xyz = this.linearToXyz.convert(linear);
    return this.xyzToLab.convert(xyz);
  }

  /**
   * LAB → sRGB 一括変換
   */
  labToSrgb(lab: LABColor): SRGBColor {
    const xyz = this.labToXyz.convert(lab);
    const linear = this.xyzToLinear.convert(xyz);
    return this.linearToSrgb.convert(linear);
  }

  /**
   * sRGB → XYZ 一括変換
   */
  srgbToXyz(srgb: SRGBColor): XYZColor {
    const linear = this.srgbToLinear.convert(srgb);
    return this.linearToXyz.convert(linear);
  }

  /**
   * XYZ → sRGB 一括変換
   */
  xyzToSrgb(xyz: XYZColor): SRGBColor {
    const linear = this.xyzToLinear.convert(xyz);
    return this.linearToSrgb.convert(linear);
  }

  /**
   * 2色のsRGB間のデルタE計算（LAB経由）
   */
  calculateDeltaE(
    srgb1: SRGBColor,
    srgb2: SRGBColor,
    method: 'CIE76' | 'CIE94' | 'CIEDE2000' = 'CIEDE2000'
  ): number {
    const lab1 = this.srgbToLab(srgb1);
    const lab2 = this.srgbToLab(srgb2);

    switch (method) {
      case 'CIE76':
        return this.deltaE.calculateCIE76(lab1, lab2);
      case 'CIE94':
        return this.deltaE.calculateCIE94(lab1, lab2);
      case 'CIEDE2000':
        return this.deltaE.calculateCIEDE2000(lab1, lab2);
      default:
        return this.deltaE.calculateCIEDE2000(lab1, lab2);
    }
  }

  /**
   * 高速バッチ変換（ImageData対応）
   */
  convertImageDataToLab(imageData: ImageData): Float32Array {
    const pixels = imageData.data; // Uint8ClampedArray
    const labArray = new Float32Array((pixels.length / 4) * 3); // RGB only

    let labIndex = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const srgb: SRGBColor = {
        r: pixels[i] || 0,
        g: pixels[i + 1] || 0,
        b: pixels[i + 2] || 0,
      };

      const lab = this.srgbToLab(srgb);
      labArray[labIndex] = lab.l;
      labArray[labIndex + 1] = lab.a;
      labArray[labIndex + 2] = lab.b;
      labIndex += 3;
    }

    return labArray;
  }

  /**
   * ガンマ補正テスト用ユーティリティ
   */
  testGammaCorrection(): {
    srgbToLinear: number[];
    linearToSrgb: number[];
    roundTripError: number[];
  } {
    const testValues = [0, 64, 128, 192, 255];
    const results = {
      srgbToLinear: [] as number[],
      linearToSrgb: [] as number[],
      roundTripError: [] as number[],
    };

    for (const value of testValues) {
      const srgb: SRGBColor = { r: value, g: value, b: value };
      const linear = this.srgbToLinear.convert(srgb);
      const backToSrgb = this.linearToSrgb.convert(linear);

      results.srgbToLinear.push(linear.r);
      results.linearToSrgb.push(backToSrgb.r);
      results.roundTripError.push(Math.abs(backToSrgb.r - value));
    }

    return results;
  }
}
