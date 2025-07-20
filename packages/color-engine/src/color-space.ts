/**
 * Color space conversion utilities
 * Based on Phase 0 verification results - CIE standard compliant
 */

import { RGBColor, HSVColor, LABColor } from './types.js';

export class ColorSpaceConverter {
  // sRGB to Linear RGB conversion
  static srgbToLinear(value: number): number {
    const normalized = value / 255;
    if (normalized <= 0.04045) {
      return normalized / 12.92;
    } else {
      return Math.pow((normalized + 0.055) / 1.055, 2.4);
    }
  }

  // Linear RGB to sRGB conversion
  static linearToSrgb(value: number): number {
    if (value <= 0.0031308) {
      return value * 12.92 * 255;
    } else {
      return (1.055 * Math.pow(value, 1 / 2.4) - 0.055) * 255;
    }
  }

  // RGB to LAB conversion (CIE standard compliant)
  static rgbToLab(rgb: RGBColor): LABColor {
    // Convert to Linear RGB
    const r = this.srgbToLinear(rgb.r);
    const g = this.srgbToLinear(rgb.g);
    const b = this.srgbToLinear(rgb.b);

    // Convert to XYZ (D65 illuminant)
    let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    let y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
    let z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

    // Normalize to D65 illuminant
    x = x / 0.95047;
    y = y / 1.0;
    z = z / 1.08883;

    // XYZ to LAB
    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    const l = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bValue = 200 * (fy - fz);

    return { l, a, b: bValue };
  }

  // RGB to HSV conversion
  static rgbToHsv(rgb: RGBColor): HSVColor {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    const s = max === 0 ? 0 : (diff / max) * 100;
    const v = max * 100;

    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / diff + 2) * 60;
          break;
        case b:
          h = ((r - g) / diff + 4) * 60;
          break;
      }
    }

    return { h, s, v };
  }

  // Calculate perceptual color distance (Delta E CIE76)
  static calculateDeltaE(color1: LABColor, color2: LABColor): number {
    const dl = color1.l - color2.l;
    const da = color1.a - color2.a;
    const db = color1.b - color2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  // Calculate RGB color distance
  static calculateRgbDistance(color1: RGBColor, color2: RGBColor): number {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // Calculate perceptual luminance (WCAG compliant)
  static calculateLuminance(rgb: RGBColor): number {
    const r = this.srgbToLinear(rgb.r);
    const g = this.srgbToLinear(rgb.g);
    const b = this.srgbToLinear(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}
