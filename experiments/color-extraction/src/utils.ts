import type { RGB, LAB, ColorData } from './types.js';

export function rgbToLab(rgb: RGB): LAB {
  // sRGB to Linear RGB
  const toLinear = (c: number) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  // Linear RGB to XYZ (D65 illuminant)
  let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  let y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  let z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  // Normalize to D65 white point
  x = x / 0.95047;
  y = y / 1.0;
  z = z / 1.08883;

  // XYZ to LAB
  const f = (t: number) => {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  };

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bValue = 200 * (fy - fz);

  return { l, a, b: bValue };
}

export function calculateLuminance(rgb: RGB): number {
  // Relative luminance (ITU-R BT.709)
  const toLinear = (c: number) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return (
    0.2126 * toLinear(rgb.r) +
    0.7152 * toLinear(rgb.g) +
    0.0722 * toLinear(rgb.b)
  );
}

export function classifyTemperature(rgb: RGB): 'warm' | 'cool' | 'neutral' {
  const { r, g, b } = rgb;
  const warmness = r + g * 0.5 - (b + g * 0.5);

  if (warmness > 20) return 'warm';
  if (warmness < -20) return 'cool';
  return 'neutral';
}

export function classifyByLuminance(colors: ColorData[]): {
  highlights: ColorData[];
  midtones: ColorData[];
  shadows: ColorData[];
} {
  const sorted = [...colors].sort((a, b) => b.luminance - a.luminance);
  const total = sorted.length;

  const highlightCount = Math.ceil(total * 0.3);
  const shadowCount = Math.ceil(total * 0.3);

  return {
    highlights: sorted.slice(0, highlightCount),
    midtones: sorted.slice(highlightCount, total - shadowCount),
    shadows: sorted.slice(total - shadowCount),
  };
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function createColorData(rgb: RGB): ColorData {
  const lab = rgbToLab(rgb);
  const luminance = calculateLuminance(rgb);
  const temperature = classifyTemperature(rgb);

  let paintingRole: 'highlight' | 'midtone' | 'shadow';
  if (luminance > 0.7) paintingRole = 'highlight';
  else if (luminance > 0.3) paintingRole = 'midtone';
  else paintingRole = 'shadow';

  return {
    rgb,
    hex: rgbToHex(rgb),
    lab,
    luminance,
    temperature,
    paintingRole,
  };
}
