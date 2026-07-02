import { describe, it, expect } from 'vitest';
import { ColorSpaceConverter } from './color-space';
import type { RGBColor } from './types';

describe('ColorSpaceConverter', () => {
  const black: RGBColor = { r: 0, g: 0, b: 0 };
  const white: RGBColor = { r: 255, g: 255, b: 255 };
  const red: RGBColor = { r: 255, g: 0, b: 0 };
  const gray: RGBColor = { r: 128, g: 128, b: 128 };

  describe('srgbToLinear / linearToSrgb', () => {
    it('round-trips 0 and 255', () => {
      expect(ColorSpaceConverter.srgbToLinear(0)).toBeCloseTo(0, 5);
      expect(
        ColorSpaceConverter.linearToSrgb(ColorSpaceConverter.srgbToLinear(255))
      ).toBeCloseTo(255, 1);
    });
  });

  describe('rgbToLab', () => {
    it('maps black to L=0, a=0, b=0', () => {
      const lab = ColorSpaceConverter.rgbToLab(black);
      expect(lab.l).toBeCloseTo(0, 1);
      expect(lab.a).toBeCloseTo(0, 1);
      expect(lab.b).toBeCloseTo(0, 1);
    });

    it('maps white to L=100, a=0, b=0', () => {
      const lab = ColorSpaceConverter.rgbToLab(white);
      expect(lab.l).toBeCloseTo(100, 0);
      expect(lab.a).toBeCloseTo(0, 0);
      expect(lab.b).toBeCloseTo(0, 0);
    });

    it('gives pure red a positive a value (redness)', () => {
      const lab = ColorSpaceConverter.rgbToLab(red);
      expect(lab.a).toBeGreaterThan(0);
    });
  });

  describe('rgbToHsv', () => {
    it('maps pure red to h=0, s=100, v=100', () => {
      const hsv = ColorSpaceConverter.rgbToHsv(red);
      expect(hsv.h).toBeCloseTo(0, 5);
      expect(hsv.s).toBeCloseTo(100, 5);
      expect(hsv.v).toBeCloseTo(100, 5);
    });

    it('maps gray to s=0', () => {
      const hsv = ColorSpaceConverter.rgbToHsv(gray);
      expect(hsv.s).toBeCloseTo(0, 5);
    });

    it('maps black to v=0', () => {
      const hsv = ColorSpaceConverter.rgbToHsv(black);
      expect(hsv.v).toBeCloseTo(0, 5);
    });
  });

  describe('calculateDeltaE', () => {
    it('returns 0 for identical colors', () => {
      const lab = ColorSpaceConverter.rgbToLab(red);
      expect(ColorSpaceConverter.calculateDeltaE(lab, lab)).toBeCloseTo(0, 5);
    });

    it('returns a large value for black vs white', () => {
      const labBlack = ColorSpaceConverter.rgbToLab(black);
      const labWhite = ColorSpaceConverter.rgbToLab(white);
      expect(
        ColorSpaceConverter.calculateDeltaE(labBlack, labWhite)
      ).toBeGreaterThan(50);
    });
  });

  describe('calculateRgbDistance', () => {
    it('returns 0 for identical colors', () => {
      expect(ColorSpaceConverter.calculateRgbDistance(red, red)).toBe(0);
    });

    it('returns sqrt(3)*255 for black vs white', () => {
      expect(
        ColorSpaceConverter.calculateRgbDistance(black, white)
      ).toBeCloseTo(Math.sqrt(3) * 255, 5);
    });
  });

  describe('calculateLuminance', () => {
    it('returns 0 for black and ~1 for white', () => {
      expect(ColorSpaceConverter.calculateLuminance(black)).toBeCloseTo(0, 5);
      expect(ColorSpaceConverter.calculateLuminance(white)).toBeCloseTo(1, 5);
    });
  });
});
