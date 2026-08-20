import { describe, it, expect } from 'vitest';
import { type ExtractedColor } from '@palette-tool/color-engine';
import {
  barRatio,
  colorBarGroups,
  formatBarValue,
  rgbToHex,
} from './palette-card-model';

const colorOf = (r: number, g: number, b: number): ExtractedColor =>
  ({ color: { r, g, b } }) as ExtractedColor;

/**
 * This model is the single source the panel and the PNG export both render, so
 * these assertions are what keeps the two surfaces from drifting apart.
 */
describe('colorBarGroups', () => {
  it('returns HSL then HScL, three bars each, in display order', () => {
    const groups = colorBarGroups(colorOf(200, 100, 50));

    expect(groups.map((group) => group.name)).toEqual(['HSL', 'HScL']);
    expect(groups[0]!.bars.map((bar) => bar.label)).toEqual(['H', 'S', 'L']);
    expect(groups[1]!.bars.map((bar) => bar.label)).toEqual(['H', 'Sc', 'L']);
  });

  it('scales hue against 360 and the other channels against 100', () => {
    const [hsl] = colorBarGroups(colorOf(200, 100, 50));

    expect(hsl!.bars[0]!.max).toBe(360);
    expect(hsl!.bars[1]!.max).toBe(100);
    expect(hsl!.bars[2]!.max).toBe(100);
  });

  it('gives every bar a fill both CSS and canvas accept', () => {
    const bars = colorBarGroups(colorOf(200, 100, 50)).flatMap((group) => group.bars);

    expect(bars).toHaveLength(6);
    for (const bar of bars) {
      expect(bar.fill).toMatch(/^(hsl\(|#)/);
    }
  });

  it('degrees the hue bars and percents the rest', () => {
    const [hsl, hscl] = colorBarGroups(colorOf(200, 100, 50));

    expect(hsl!.bars[0]!.suffix).toBe('°');
    expect(hsl!.bars[1]!.suffix).toBe('%');
    expect(hscl!.bars[0]!.suffix).toBe('°');
    expect(hscl!.bars[1]!.suffix).toBe('%');
  });
});

describe('barRatio', () => {
  const bar = (value: number, max: number) =>
    ({ label: 'H', value, max, suffix: '', fill: '#000' });

  it('is the value as a fraction of the track', () => {
    expect(barRatio(bar(180, 360))).toBe(0.5);
  });

  it('clamps out of range values so a bar never overruns its track', () => {
    expect(barRatio(bar(400, 360))).toBe(1);
    expect(barRatio(bar(-10, 100))).toBe(0);
  });
});

describe('formatBarValue', () => {
  it('joins the value to its unit exactly as the panel prints it', () => {
    expect(formatBarValue({ label: 'H', value: 210, max: 360, suffix: '°', fill: '#000' })).toBe(
      '210°'
    );
  });
});

describe('rgbToHex', () => {
  it('pads single digit channels', () => {
    expect(rgbToHex({ r: 0, g: 10, b: 255 })).toBe('#000aff');
  });

  it('rounds fractional channels', () => {
    expect(rgbToHex({ r: 0.6, g: 254.4, b: 127.5 })).toBe('#01fe80');
  });
});
