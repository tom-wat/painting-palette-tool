import { describe, it, expect } from 'vitest';
import {
  rgbToHsl,
  rgbToGrayscale,
  rgbToLab,
  labToLch,
  rgbToLch,
  rgbToOklch,
  calculateSc,
  calculateHScL,
  getAllColorSpaces,
  formatColorValue,
  calculateColorDistance,
  areColorsSimilar,
  type RGBColor,
} from './color-space-conversions';

const black: RGBColor = { r: 0, g: 0, b: 0 };
const white: RGBColor = { r: 255, g: 255, b: 255 };
const red: RGBColor = { r: 255, g: 0, b: 0 };
const green: RGBColor = { r: 0, g: 255, b: 0 };
const blue: RGBColor = { r: 0, g: 0, b: 255 };
const gray: RGBColor = { r: 128, g: 128, b: 128 };

describe('rgbToHsl', () => {
  it('maps black to h=0, s=0, l=0', () => {
    expect(rgbToHsl(black)).toEqual({ h: 0, s: 0, l: 0 });
  });

  it('maps white to h=0, s=0, l=100', () => {
    expect(rgbToHsl(white)).toEqual({ h: 0, s: 0, l: 100 });
  });

  it('maps pure red to h=0, s=100, l=50', () => {
    expect(rgbToHsl(red)).toEqual({ h: 0, s: 100, l: 50 });
  });

  it('maps pure green to h=120, s=100, l=50', () => {
    expect(rgbToHsl(green)).toEqual({ h: 120, s: 100, l: 50 });
  });

  it('maps gray to s=0', () => {
    expect(rgbToHsl(gray).s).toBe(0);
  });
});

describe('rgbToGrayscale', () => {
  it('leaves black and white unchanged', () => {
    expect(rgbToGrayscale(black)).toEqual({ r: 0, g: 0, b: 0 });
    expect(rgbToGrayscale(white)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('produces r=g=b using Rec. 709 coefficients', () => {
    const gray709 = rgbToGrayscale(red);
    expect(gray709.r).toBe(gray709.g);
    expect(gray709.g).toBe(gray709.b);
    expect(gray709.r).toBe(Math.round(0.2126 * 255));
  });
});

describe('rgbToLab', () => {
  it('maps black to L=0, a=0, b=0', () => {
    expect(rgbToLab(black)).toEqual({ l: 0, a: 0, b: 0 });
  });

  it('maps white to L=100, a=0, b=0', () => {
    const lab = rgbToLab(white);
    expect(lab.l).toBe(100);
    expect(lab.a).toBeCloseTo(0, 5);
    expect(lab.b).toBeCloseTo(0, 5);
  });

  it('gives pure red a positive a value', () => {
    expect(rgbToLab(red).a).toBeGreaterThan(0);
  });
});

describe('labToLch / rgbToLch', () => {
  it('maps a neutral LAB color to c=0', () => {
    expect(labToLch({ l: 50, a: 0, b: 0 })).toEqual({ l: 50, c: 0, h: 0 });
  });

  it('rgbToLch(black) has c=0', () => {
    expect(rgbToLch(black).c).toBe(0);
  });

  it('rgbToLch(red) has a positive chroma', () => {
    expect(rgbToLch(red).c).toBeGreaterThan(0);
  });
});

describe('rgbToOklch', () => {
  it('maps black to l=0, c=0', () => {
    const oklch = rgbToOklch(black);
    expect(oklch.l).toBe(0);
    expect(oklch.c).toBe(0);
  });

  it('maps white to l=100', () => {
    expect(rgbToOklch(white).l).toBeCloseTo(100, 0);
  });

  it('gives pure blue a positive chroma', () => {
    expect(rgbToOklch(blue).c).toBeGreaterThan(0);
  });
});

describe('calculateSc', () => {
  it('is 0 for a neutral color', () => {
    expect(calculateSc(gray)).toBe(0);
    expect(calculateSc(black)).toBe(0);
    expect(calculateSc(white)).toBe(0);
  });

  it('is positive for a saturated color', () => {
    expect(calculateSc(red)).toBeGreaterThan(0);
  });
});

describe('calculateHScL', () => {
  it('combines HSL hue, Sc, and LCH lightness', () => {
    const hscl = calculateHScL(red);
    const hsl = rgbToHsl(red);
    const lch = rgbToLch(red);
    expect(hscl.h).toBe(hsl.h);
    expect(hscl.l).toBe(lch.l);
    expect(hscl.sc).toBe(calculateSc(red));
  });

  it('is neutral (sc=0) for gray', () => {
    expect(calculateHScL(gray).sc).toBe(0);
  });
});

describe('getAllColorSpaces', () => {
  it('returns rgb, hsl, lab, lch, oklch, and sc for a color', () => {
    const spaces = getAllColorSpaces(red);
    expect(spaces.rgb).toEqual(red);
    expect(spaces.hsl).toEqual(rgbToHsl(red));
    expect(spaces.lab).toEqual(rgbToLab(red));
    expect(spaces.lch).toEqual(rgbToLch(red));
    expect(spaces.oklch).toEqual(rgbToOklch(red));
    expect(spaces.sc).toBe(calculateSc(red));
  });
});

describe('formatColorValue', () => {
  it('formats hsl, lab, lch, oklch, and hscl strings', () => {
    expect(formatColorValue('hsl', { h: 10, s: 20, l: 30 })).toBe(
      'hsl(10, 20%, 30%)'
    );
    expect(formatColorValue('lab', { l: 10, a: 20, b: -5 })).toBe(
      'lab(10%, 20, -5)'
    );
    expect(formatColorValue('lch', { l: 10, c: 20, h: 30 })).toBe(
      'lch(10%, 20, 30)'
    );
    expect(formatColorValue('oklch', { l: 10, c: 0.2, h: 30 })).toBe(
      'oklch(10%, 0.2, 30)'
    );
    expect(formatColorValue('hscl', { h: 10, sc: 20, l: 30 })).toBe(
      'HScL(10, 20, 30)'
    );
  });

  it('returns an empty string for an unknown color space', () => {
    expect(formatColorValue('unknown', { h: 0, s: 0, l: 0 })).toBe('');
  });
});

describe('calculateColorDistance', () => {
  it('is 0 for identical colors', () => {
    expect(calculateColorDistance(red, red)).toBe(0);
  });

  it('is larger for black vs white than for two similar grays', () => {
    const distanceBlackWhite = calculateColorDistance(black, white);
    const distanceGrays = calculateColorDistance(
      { r: 128, g: 128, b: 128 },
      { r: 130, g: 130, b: 130 }
    );
    expect(distanceBlackWhite).toBeGreaterThan(distanceGrays);
  });
});

describe('areColorsSimilar', () => {
  it('treats identical colors as similar', () => {
    expect(areColorsSimilar(red, red)).toBe(true);
  });

  it('treats black and white as not similar', () => {
    expect(areColorsSimilar(black, white)).toBe(false);
  });

  it('respects a custom threshold', () => {
    const c1: RGBColor = { r: 100, g: 100, b: 100 };
    const c2: RGBColor = { r: 110, g: 100, b: 100 };
    expect(areColorsSimilar(c1, c2, 1)).toBe(false);
    expect(areColorsSimilar(c1, c2, 100)).toBe(true);
  });
});
