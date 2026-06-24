import { rgbToHsl, calculateHScL, type RGBColor } from './color-space-conversions';

export type AnnotationColorSpace = 'hscl' | 'hsl';

const FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

interface BarRow {
  label: string;
  value: number;
  max: number;
  suffix: string;
  /** Fill color of the bar (matches ColorPalette "pick" display). */
  fill: string;
}

// Bar fill colors — mirror getBarColor() in ColorPalette so the annotation
// labels match the "pick" palette display.
function buildRows(color: RGBColor, colorSpace: AnnotationColorSpace): BarRow[] {
  if (colorSpace === 'hsl') {
    const hsl = rgbToHsl(color);
    return [
      { label: 'H', value: hsl.h, max: 360, suffix: '°', fill: `hsl(${hsl.h}, 50%, 50%)` },
      { label: 'S', value: hsl.s, max: 100, suffix: '%', fill: `hsl(${hsl.h}, ${hsl.s}%, 60%)` },
      { label: 'L', value: hsl.l, max: 100, suffix: '%', fill: `hsl(${hsl.h}, 50%, 60%)` },
    ];
  }
  const hscl = calculateHScL(color);
  return [
    { label: 'H', value: hscl.h, max: 360, suffix: '°', fill: `hsl(${hscl.h}, 50%, 50%)` },
    { label: 'Sc', value: hscl.sc, max: 100, suffix: '%', fill: `hsl(${hscl.h}, ${hscl.sc}%, 60%)` },
    { label: 'L', value: hscl.l, max: 100, suffix: '%', fill: `hsl(${hscl.h}, 50%, 60%)` },
  ];
}

export interface DrawAnnotationLabelOptions {
  color: RGBColor;
  /** Connector line start (image/screen coords matching ctx). */
  anchor: { x: number; y: number };
  /** Label box center (image/screen coords matching ctx). */
  label: { x: number; y: number };
  lineOpacity: number;
  fontSize: number;
  canvasWidth: number;
  theme: 'light' | 'dark';
  lineColor: string;
  colorSpace: AnnotationColorSpace;
  /** Opaque box background (on-canvas preview) vs. semi-transparent (export). */
  opaqueBg?: boolean;
}

/**
 * Draw a single color annotation (connector line + label box with swatch and
 * value bars) onto a canvas context. Shared by the on-canvas preview
 * (ImageCanvas) and PNG export (export-formats) so both render identically.
 */
export function drawAnnotationLabel(
  ctx: CanvasRenderingContext2D,
  opts: DrawAnnotationLabelOptions
): void {
  const {
    color,
    anchor,
    label,
    lineOpacity,
    fontSize,
    canvasWidth,
    theme,
    lineColor,
    colorSpace,
    opaqueBg = false,
  } = opts;

  const isDark = theme === 'dark';
  const boxBg = opaqueBg
    ? isDark ? '#1a1a1a' : '#f8f8f8'
    : isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const textPrimary = isDark ? '#ffffff' : '#1f2937';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const trackBg = isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb';

  const { r, g, b } = color;
  const rows = buildRows(color, colorSpace);
  const title = colorSpace === 'hsl' ? 'HSL' : 'HScL';

  // Connector line
  ctx.save();
  ctx.globalAlpha = lineOpacity;
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(label.x, label.y);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(1, fontSize / 10);
  ctx.stroke();
  ctx.restore();

  // Layout metrics
  const pad = Math.round(fontSize * 0.4);
  const swatchSize = fontSize;
  const barW = Math.round(fontSize * 7);
  const barH = Math.max(3, Math.round(fontSize * 0.28));
  const valueGap = Math.round(fontSize * 0.25); // between value text and its bar
  const rowGap = Math.round(fontSize * 0.5); // between rows
  const rowH = fontSize + valueGap + barH;
  const headerH = swatchSize;
  const headerGap = Math.round(fontSize * 0.45);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  const extraPad = isTauri ? Math.round(fontSize * 0.25) : 0;

  ctx.font = `${fontSize}px ${FONT_STACK}`;
  const titleW = ctx.measureText(title).width;
  const headerW = swatchSize + pad + titleW;

  const contentW = Math.max(barW, headerW);
  const boxW = contentW + pad * 2 + extraPad;
  const boxH =
    headerH + headerGap + rowH * rows.length + rowGap * (rows.length - 1) + pad * 2 + extraPad;

  // Position box centered on the label point, clamped to canvas horizontally
  const bx = Math.max(0, Math.min(label.x - boxW / 2, canvasWidth - boxW));
  const by = label.y - boxH / 2;

  const radius = Math.round(fontSize * 0.25);
  ctx.fillStyle = boxBg;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, radius);
  ctx.fill();

  const contentX = bx + pad;

  // Header: swatch + colorspace name
  const swatchY = by + pad;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(contentX, swatchY, swatchSize, swatchSize);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 220 || brightness < 30) {
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(contentX, swatchY, swatchSize, swatchSize);
  }

  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textPrimary;
  ctx.fillText(title, contentX + swatchSize + pad, swatchY + swatchSize / 2);

  // Value-bar rows
  ctx.textBaseline = 'top';
  let rowY = by + pad + headerH + headerGap;
  for (const row of rows) {
    // Label (left) + value (right)
    ctx.font = `${fontSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = textSecondary;
    ctx.fillText(row.label, contentX, rowY);

    const valueText = `${row.value}${row.suffix}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = textPrimary;
    ctx.fillText(valueText, contentX + barW, rowY);

    // Bar track + fill
    const barY = rowY + fontSize + valueGap;
    ctx.fillStyle = trackBg;
    ctx.beginPath();
    ctx.roundRect(contentX, barY, barW, barH, barH / 2);
    ctx.fill();

    const fillW = Math.min((row.value / row.max) * barW, barW);
    if (fillW > 0) {
      ctx.fillStyle = row.fill;
      ctx.beginPath();
      ctx.roundRect(contentX, barY, Math.max(fillW, barH), barH, barH / 2);
      ctx.fill();
    }

    rowY += rowH + rowGap;
  }

  ctx.textAlign = 'left';
}
