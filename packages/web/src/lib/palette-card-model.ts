/**
 * The bar-graph model behind a colour swatch.
 *
 * `ColorValueBars` renders it as JSX and the PNG export draws it on a canvas,
 * so the numbers, the ordering and the bar colours are decided in exactly one
 * place. Add a measurement here and both surfaces pick it up.
 */
import {
  type RGBColor,
  type ExtractedColor,
  calculateHScL,
  rgbToHsl,
} from '@palette-tool/color-engine';

export interface ColorBar {
  label: string;
  value: number;
  /** Full-scale value, i.e. what a 100%-wide bar means. */
  max: number;
  suffix: string;
  /** Ready for `style.backgroundColor` and for `ctx.fillStyle` alike. */
  fill: string;
}

export interface ColorBarGroup {
  /** Shown as a heading only when labels are on. */
  name: 'HSL' | 'HScL';
  bars: ColorBar[];
}

/** A swatch's colour as `#rrggbb`. Lives here so the panel and the PNG agree. */
export function rgbToHex(color: RGBColor): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/** Neutral fill for a channel with no meaningful hue of its own. */
const NEUTRAL_FILL = '#9ca3af';

function barFill(
  colorSpace: 'hsl' | 'hscl',
  type: 'H' | 'S' | 'L' | 'Sc',
  value: number,
  color: RGBColor
): string {
  const hue = colorSpace === 'hsl' ? rgbToHsl(color).h : calculateHScL(color).h;

  switch (type) {
    case 'H':
      return `hsl(${value}, 50%, 50%)`;
    case 'S':
    case 'Sc':
      return `hsl(${hue}, ${value}%, 60%)`;
    case 'L':
      return `hsl(${hue}, 50%, 60%)`;
    default:
      return NEUTRAL_FILL;
  }
}

/** How a bar's value reads next to its label, e.g. `210°`. */
export function formatBarValue(bar: ColorBar): string {
  return `${bar.value}${bar.suffix}`;
}

/** Fraction of the track a bar fills, clamped to 0-1. */
export function barRatio(bar: ColorBar): number {
  return Math.min(Math.max(bar.value / bar.max, 0), 1);
}

/** The HSL and HScL bar groups drawn under a swatch, in display order. */
export function colorBarGroups(color: ExtractedColor): ColorBarGroup[] {
  const rgb = color.color;
  const hsl = rgbToHsl(rgb);
  const hscl = calculateHScL(rgb);

  const bar = (
    label: string,
    value: number,
    max: number,
    suffix: string,
    colorSpace: 'hsl' | 'hscl',
    type: 'H' | 'S' | 'L' | 'Sc'
  ): ColorBar => ({
    label,
    value,
    max,
    suffix,
    fill: barFill(colorSpace, type, value, rgb),
  });

  return [
    {
      name: 'HSL',
      bars: [
        bar('H', hsl.h, 360, '°', 'hsl', 'H'),
        bar('S', hsl.s, 100, '%', 'hsl', 'S'),
        bar('L', hsl.l, 100, '%', 'hsl', 'L'),
      ],
    },
    {
      name: 'HScL',
      bars: [
        bar('H', hscl.h, 360, '°', 'hscl', 'H'),
        bar('Sc', hscl.sc, 100, '%', 'hscl', 'Sc'),
        bar('L', hscl.l, 100, '%', 'hscl', 'L'),
      ],
    },
  ];
}
