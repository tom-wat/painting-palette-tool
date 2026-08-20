import { describe, it, expect, afterEach } from 'vitest';
import { getCanvasThemeColor } from './canvas-theme';

/**
 * The tokens in globals.css are oklch *channels* (`0.922 0 0`), a format
 * `ctx.fillStyle` ignores silently. These cover the conversion that stands
 * between a token and a canvas, including the fallbacks that keep an export
 * from being drawn in the wrong colour when a token cannot be read.
 */
describe('getCanvasThemeColor', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--border');
    document.documentElement.style.removeProperty('--foreground');
  });

  it('converts the achromatic tokens to their shadcn neutral hexes', () => {
    document.documentElement.style.setProperty('--foreground', '0.145 0 0');
    document.documentElement.style.setProperty('--border', '0.922 0 0');

    expect(getCanvasThemeColor('--foreground')).toBe('#0a0a0a');
    expect(getCanvasThemeColor('--border')).toBe('#e5e5e5');
  });

  it('converts a chromatic token, so adding a hue later still exports', () => {
    // oklch(0.577 0.245 27.325) — the red shadcn ships for --destructive.
    document.documentElement.style.setProperty('--foreground', '0.577 0.245 27.325');
    expect(getCanvasThemeColor('--foreground')).toMatch(/^#[0-9a-f]{6}$/);
    expect(getCanvasThemeColor('--foreground')).not.toBe('#000000');
  });

  it('clamps channels that fall outside sRGB', () => {
    document.documentElement.style.setProperty('--foreground', '1.4 0 0');
    expect(getCanvasThemeColor('--foreground')).toBe('#ffffff');
  });

  it('falls back to the known hex when the token is missing', () => {
    expect(getCanvasThemeColor('--border')).toBe('#e5e5e5');
  });

  it('falls back rather than emitting a colour from unparseable channels', () => {
    document.documentElement.style.setProperty('--border', 'oklch(0.922 0 0)');
    expect(getCanvasThemeColor('--border')).toBe('#e5e5e5');
  });
});
