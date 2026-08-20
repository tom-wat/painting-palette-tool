/**
 * The UI font, resolved for use with the Canvas 2D API.
 *
 * `next/font` self-hosts JetBrains Mono under a generated family name
 * (`__JetBrains_Mono_<hash>`) and exposes it only through the CSS variable
 * `--font-jetbrains-mono`. Canvas cannot read CSS variables, so read the
 * computed value once and build a real font stack from it — otherwise
 * everything drawn onto a canvas silently falls back to the OS font and stops
 * matching the interface around it.
 */

/** Used when the variable is unavailable: SSR, tests, or a missing font. */
const FALLBACK_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

let resolved: string | null = null;

/** Font stack for `ctx.font`, e.g. `${fontSize}px ${getCanvasFontStack()}`. */
export function getCanvasFontStack(): string {
  if (resolved) return resolved;
  if (typeof document === 'undefined') return FALLBACK_STACK;

  const family = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-jetbrains-mono')
    .trim();
  if (!family) return FALLBACK_STACK;

  // Only cache a real answer — an early call must not pin the fallback.
  resolved = `${family}, ${FALLBACK_STACK}`;
  return resolved;
}

/**
 * Await before drawing text that ends up in an exported file. Canvas silently
 * substitutes a font that has not finished loading, and an export is kept.
 */
export async function ensureCanvasFontLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.ready;
  } catch {
    // A font that fails to load is not a reason to abandon the export.
  }
}
