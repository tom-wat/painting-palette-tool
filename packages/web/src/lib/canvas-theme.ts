/**
 * Design tokens, resolved for use with the Canvas 2D API.
 *
 * `globals.css` stores every token as oklch *channels only* (`--border: 0.922 0
 * 0;`) so that Tailwind's `oklch(var(--x) / <alpha-value>)` keeps an alpha slot
 * free. That format cannot be handed to `ctx.fillStyle` — the assignment is
 * silently ignored and the canvas keeps whatever colour it had — so read the
 * channels and convert them to sRGB here.
 *
 * Reading the live variables (rather than hard-coding hexes) is what keeps a
 * PNG export looking like the panel it was exported from: retheming
 * `globals.css`, or switching `<html>` to `.dark`, carries into the image.
 */

/** Used when a variable cannot be read: SSR, tests, or a token that was removed. */
const FALLBACK: Record<string, string> = {
  '--background': '#ffffff',
  '--foreground': '#0a0a0a',
  '--muted': '#f5f5f5',
  '--muted-foreground': '#737373',
  '--border': '#e5e5e5',
};

function gammaEncode(channel: number): number {
  const v =
    channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  return Math.round(Math.min(Math.max(v, 0), 1) * 255);
}

/** oklch channels (L 0-1, C, H in degrees) to a `#rrggbb` string. */
function oklchToHex(l: number, c: number, hDegrees: number): string {
  const h = (hDegrees * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const lCube = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  const mCube = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  const sCube = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3);

  const r = 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  const g = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  const blue = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube;

  const toHex = (channel: number) => gammaEncode(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(blue)}`;
}

/**
 * The current value of a semantic token as `#rrggbb`.
 *
 * Not cached: an export is rare, `getComputedStyle` is cheap next to drawing,
 * and a cache would pin the light palette if the theme ever switches.
 */
export function getCanvasThemeColor(token: string): string {
  const fallback = FALLBACK[token] ?? '#000000';
  if (typeof document === 'undefined') return fallback;

  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw) return fallback;

  const channels = raw.split(/[\s/]+/).map(Number);
  if (channels.length < 3 || channels.some((n) => !Number.isFinite(n))) return fallback;

  return oklchToHex(channels[0], channels[1], channels[2]);
}
