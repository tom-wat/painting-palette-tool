/**
 * Advanced color space conversion utilities for LCH and OkLCH
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface LABColor {
  l: number;
  a: number;
  b: number;
}

export interface LCHColor {
  l: number;
  c: number;
  h: number;
}

export interface OkLCHColor {
  l: number;
  c: number;
  h: number;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(color: RGBColor): HSLColor {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert RGB to XYZ color space (D65 illuminant, sRGB primaries)
 */
function rgbToXyz(color: RGBColor): { x: number; y: number; z: number } {
  // Convert RGB to linear RGB
  const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  // sRGB to XYZ transformation matrix (D65)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  return { x, y, z };
}

/**
 * Convert XYZ to CIELAB
 */
function xyzToLab(xyz: { x: number; y: number; z: number }): LABColor {
  // D65 white point
  const Xn = 0.95047;
  const Yn = 1.0;
  const Zn = 1.08883;

  const fx = xyz.x / Xn;
  const fy = xyz.y / Yn;
  const fz = xyz.z / Zn;

  const delta = 6 / 29;
  const deltaSquared = delta * delta;
  const deltaCubed = delta * delta * delta;

  const fxTransform = fx > deltaCubed ? Math.pow(fx, 1/3) : (fx / (3 * deltaSquared)) + (4 / 29);
  const fyTransform = fy > deltaCubed ? Math.pow(fy, 1/3) : (fy / (3 * deltaSquared)) + (4 / 29);
  const fzTransform = fz > deltaCubed ? Math.pow(fz, 1/3) : (fz / (3 * deltaSquared)) + (4 / 29);

  const l = 116 * fyTransform - 16;
  const a = 500 * (fxTransform - fyTransform);
  const b = 200 * (fyTransform - fzTransform);

  return {
    l: Math.round(l),
    a: Math.round(a),
    b: Math.round(b),
  };
}

/**
 * Convert RGB to LAB
 */
export function rgbToLab(color: RGBColor): LABColor {
  const xyz = rgbToXyz(color);
  return xyzToLab(xyz);
}

/**
 * Convert LAB to LCH
 */
export function labToLch(lab: LABColor): LCHColor {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;

  return {
    l: Math.round(lab.l),
    c: Math.round(c * 10) / 10,
    h: Math.round(h),
  };
}

/**
 * Convert RGB to LCH
 */
export function rgbToLch(color: RGBColor): LCHColor {
  const lab = rgbToLab(color);
  return labToLch(lab);
}

/**
 * Convert RGB to OkLAB color space
 * Based on Björn Ottosson's OkLAB color space
 */
function rgbToOklab(color: RGBColor): { l: number; a: number; b: number } {
  // Convert RGB to linear RGB
  const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  // Linear RGB to OkLAB transformation
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    l: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Convert OkLAB to OkLCH
 */
function oklabToOklch(oklab: { l: number; a: number; b: number }): OkLCHColor {
  const c = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
  let h = Math.atan2(oklab.b, oklab.a) * 180 / Math.PI;
  if (h < 0) h += 360;

  return {
    l: Math.round(oklab.l * 1000) / 10, // Convert to percentage with 1 decimal
    c: Math.round(c * 1000) / 1000, // 3 decimal places
    h: Math.round(h),
  };
}

/**
 * Convert RGB to OkLCH
 */
export function rgbToOklch(color: RGBColor): OkLCHColor {
  const oklab = rgbToOklab(color);
  return oklabToOklch(oklab);
}

/**
 * Calculate Chroma from LAB a and b values
 */
function chromaFromLab(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

/**
 * Convert HSL to RGB (internal utility)
 */
function hslToRgb(h: number, s: number, l: number): RGBColor {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Calculate Sc (Chroma-Aligned Saturation) value
 * Finds the HSL saturation that best matches the LAB chroma at L=50
 */
export function calculateSc(color: RGBColor): number {
  const lab = rgbToLab(color);
  const hsl = rgbToHsl(color);
  const targetChroma = chromaFromLab(lab.a, lab.b);

  if (targetChroma === 0) {
    return 0; // Neutral color has zero saturation
  }

  let minDiff = Infinity;
  let bestS = 0;

  // Test S values from 0 to 100 to find the best match
  for (let s = 0; s <= 100; s++) {
    // Convert HSL with fixed L=50 to RGB, then to LAB
    const testRgb = hslToRgb(hsl.h, s / 100, 0.5);
    const testLab = rgbToLab(testRgb);
    const testChroma = chromaFromLab(testLab.a, testLab.b);
    
    const diff = Math.abs(testChroma - targetChroma);
    if (diff < minDiff) {
      minDiff = diff;
      bestS = s;
    }
  }

  return bestS;
}

/**
 * Calculate HScL value (Hue from HSL, Sc, Lightness from LCH/LAB)
 * Format: HScL(H, Sc, L)
 */
export function calculateHScL(color: RGBColor): { h: number; sc: number; l: number } {
  const hsl = rgbToHsl(color);
  const lch = rgbToLch(color);
  const sc = calculateSc(color);

  return {
    h: hsl.h,     // Hue from HSL
    sc: sc,       // Chroma-aligned Saturation
    l: lch.l      // Lightness from LCH (same as LAB L)
  };
}

/**
 * Get all color space representations for a given RGB color
 */
export function getAllColorSpaces(color: RGBColor) {
  return {
    rgb: color,
    hsl: rgbToHsl(color),
    lab: rgbToLab(color),
    lch: rgbToLch(color),
    oklch: rgbToOklch(color),
    sc: calculateSc(color),
  };
}

/**
 * Format color values for display
 */
export function formatColorValue(colorSpace: string, values: HSLColor | LABColor | LCHColor | OkLCHColor | { h: number; sc: number; l: number }): string {
  switch (colorSpace) {
    case 'hsl': {
      const hsl = values as HSLColor;
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    case 'lab': {
      const lab = values as LABColor;
      return `lab(${lab.l}%, ${lab.a}, ${lab.b})`;
    }
    case 'lch': {
      const lch = values as LCHColor;
      return `lch(${lch.l}%, ${lch.c}, ${lch.h})`;
    }
    case 'oklch': {
      const oklch = values as OkLCHColor;
      return `oklch(${oklch.l}%, ${oklch.c}, ${oklch.h})`;
    }
    case 'hscl': {
      const hscl = values as { h: number; sc: number; l: number };
      return `HScL(${hscl.h}, ${hscl.sc}, ${hscl.l})`;
    }
    default:
      return '';
  }
}

/**
 * Calculate color distance using LAB color space (more perceptually accurate)
 * Returns a value where 0 = identical colors, higher values = more different
 */
export function calculateColorDistance(color1: RGBColor, color2: RGBColor): number {
  const lab1 = rgbToLab(color1);
  const lab2 = rgbToLab(color2);
  
  // Delta E CIE76 formula (simplified)
  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;
  
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Check if two colors are similar based on a threshold
 * Threshold of ~10-15 is good for avoiding very similar colors
 */
export function areColorsSimilar(color1: RGBColor, color2: RGBColor, threshold: number = 12): boolean {
  return calculateColorDistance(color1, color2) < threshold;
}