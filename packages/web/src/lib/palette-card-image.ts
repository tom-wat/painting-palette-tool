/**
 * Draws a saved-palette card straight onto a canvas.
 *
 * This is deliberately *not* a screenshot of the DOM. Rasterising the panel
 * needs html2canvas, which throws on this theme's `oklch()` colours and leaves
 * the download silently doing nothing (see CLAUDE.md). Instead the panel and
 * this file render the same model (`palette-card-model`), and the measurements
 * below mirror the panel's Tailwind classes one for one, so the image reads as
 * the same object:
 *
 *   panel (SavedPalettesPanel / ColorPalette)   here
 *   ------------------------------------------  ----------------------
 *   text-sm font-medium  (palette name)         TITLE_SIZE / TITLE_HEIGHT
 *   grid gap-1                                  CELL_GAP
 *   aspect-square rounded border  mb-1          CELL / SWATCH_*
 *   ColorValueBars p-1                          BARS_PADDING
 *   h-1 bg-border rounded-full                  BAR_TRACK
 *   space-y-1 / mb-1 / mt-3                     BAR_GAP / BAR_MARGIN / GROUP_GAP
 *   text-[12px] label row, space-y-0.5          LABEL_SIZE / LABEL_GAP
 *
 * Colours come from the live CSS variables via `canvas-theme`, so the export
 * follows the interface rather than drifting from it.
 */
import { type ExtractedColor } from '@palette-tool/color-engine';
import { ensureCanvasFontLoaded, getCanvasFontStack } from './canvas-font';
import { getCanvasThemeColor } from './canvas-theme';
import {
  barRatio,
  colorBarGroups,
  formatBarValue,
  rgbToHex,
  type ColorBar,
  type ColorBarGroup,
} from './palette-card-model';

/** Device pixels per CSS pixel. 2 keeps 12px labels legible when zoomed. */
const SCALE = 2;

/** Margin around the whole image. */
const PADDING = 24;

const TITLE_SIZE = 14; // text-sm
const TITLE_HEIGHT = 20; // text-sm/leading-5
const TITLE_GAP = 8; // mb-2

const TAG_SIZE = 12; // text-xs
const TAG_HEIGHT = 20; // px-2 py-0.5
const TAG_PADDING_X = 8; // px-2
const TAG_RADIUS = 6; // rounded-md
const TAG_GAP = 4; // gap-1
const TAG_BLOCK_GAP = 8; // mb-2

/** Swatch edge, which is also the grid column width (aspect-square). */
const CELL = 96;
const CELL_GAP = 4; // gap-1
/** Matches the panel's widest breakpoint (2xl:grid-cols-8). */
const MAX_COLUMNS = 8;
const SWATCH_RADIUS = 4; // rounded
const SWATCH_GAP = 4; // mb-1

const BARS_PADDING = 4; // p-1
const BAR_TRACK = 4; // h-1
const BAR_GAP = 4; // space-y-1
const BAR_MARGIN = 4; // mb-1, used only when labels are hidden
const LABEL_SIZE = 12; // text-[12px]
const LABEL_HEIGHT = 18; // 12px at the inherited 1.5 line-height
const LABEL_GAP = 2; // space-y-0.5
const GROUP_HEADER_GAP = 4; // mb-1 under "HSL" / "HScL"
const GROUP_GAP = 12; // mt-3 between the two groups

/** Between palettes when several are stacked into one image. */
const SHEET_GAP = 24;

/** One palette in an exported image. */
export interface PaletteSheet {
  colors: ExtractedColor[];
  /** Drawn above the swatches; omitted for a bare strip. */
  name?: string;
  tags?: string[];
  /** Mirrors the panel's "Show Data" toggle. */
  showLabels?: boolean;
}

interface Tokens {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
}

function readTokens(): Tokens {
  return {
    background: getCanvasThemeColor('--background'),
    foreground: getCanvasThemeColor('--foreground'),
    muted: getCanvasThemeColor('--muted'),
    mutedForeground: getCanvasThemeColor('--muted-foreground'),
    border: getCanvasThemeColor('--border'),
  };
}

function columnsOf(sheet: PaletteSheet): number {
  return Math.min(Math.max(sheet.colors.length, 1), MAX_COLUMNS);
}

function rowsOf(sheet: PaletteSheet): number {
  return Math.ceil(Math.max(sheet.colors.length, 1) / columnsOf(sheet));
}

function barRowHeight(showLabels: boolean): number {
  return showLabels ? LABEL_HEIGHT + LABEL_GAP + BAR_TRACK : BAR_TRACK + BAR_MARGIN;
}

function groupHeight(group: ColorBarGroup, showLabels: boolean): number {
  const header = showLabels ? LABEL_HEIGHT + GROUP_HEADER_GAP : 0;
  const rows = group.bars.length;
  return header + rows * barRowHeight(showLabels) + (rows - 1) * BAR_GAP;
}

/**
 * Height of one grid cell: the swatch plus the bar block under it.
 *
 * Measured from the sheet's first colour — every colour produces the same
 * groups, so one cell's height is every cell's height.
 */
function cellHeight(sheet: PaletteSheet): number {
  const first = sheet.colors[0];
  if (!first) return CELL;

  const showLabels = sheet.showLabels ?? false;
  const groups = colorBarGroups(first);
  const stacked = groups.reduce((total, group) => total + groupHeight(group, showLabels), 0);
  const bars = BARS_PADDING * 2 + stacked + GROUP_GAP * (groups.length - 1);
  return CELL + SWATCH_GAP + bars;
}

function gridWidth(sheet: PaletteSheet): number {
  const columns = columnsOf(sheet);
  return columns * CELL + (columns - 1) * CELL_GAP;
}

function tagsHeight(sheet: PaletteSheet): number {
  return sheet.tags && sheet.tags.length > 0 ? TAG_HEIGHT + TAG_BLOCK_GAP : 0;
}

function sheetHeight(sheet: PaletteSheet): number {
  const rows = rowsOf(sheet);
  return (
    (sheet.name ? TITLE_HEIGHT + TITLE_GAP : 0) +
    tagsHeight(sheet) +
    rows * cellHeight(sheet) +
    (rows - 1) * CELL_GAP
  );
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  bar: ColorBar,
  x: number,
  y: number,
  width: number,
  tokens: Tokens
): void {
  ctx.fillStyle = tokens.border;
  ctx.beginPath();
  ctx.roundRect(x, y, width, BAR_TRACK, BAR_TRACK / 2);
  ctx.fill();

  const filled = width * barRatio(bar);
  if (filled <= 0) return;

  ctx.fillStyle = bar.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, filled, BAR_TRACK, Math.min(BAR_TRACK / 2, filled / 2));
  ctx.fill();
}

/** Returns the y coordinate just past the group. */
function drawGroup(
  ctx: CanvasRenderingContext2D,
  group: ColorBarGroup,
  x: number,
  top: number,
  width: number,
  showLabels: boolean,
  tokens: Tokens
): number {
  const font = getCanvasFontStack();
  let y = top;

  if (showLabels) {
    ctx.font = `500 ${LABEL_SIZE}px ${font}`;
    ctx.fillStyle = tokens.mutedForeground;
    ctx.textAlign = 'left';
    ctx.fillText(group.name, x, y + LABEL_HEIGHT / 2);
    y += LABEL_HEIGHT + GROUP_HEADER_GAP;
  }

  group.bars.forEach((bar, index) => {
    if (index > 0) y += BAR_GAP;

    if (showLabels) {
      ctx.font = `${LABEL_SIZE}px ${font}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = tokens.mutedForeground;
      ctx.fillText(bar.label, x, y + LABEL_HEIGHT / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = tokens.foreground;
      ctx.fillText(formatBarValue(bar), x + width, y + LABEL_HEIGHT / 2);
      y += LABEL_HEIGHT + LABEL_GAP;
    }

    drawBar(ctx, bar, x, y, width, tokens);
    y += BAR_TRACK;
    if (!showLabels) y += BAR_MARGIN;
  });

  return y;
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  color: ExtractedColor,
  x: number,
  top: number,
  showLabels: boolean,
  tokens: Tokens
): void {
  ctx.fillStyle = rgbToHex(color.color);
  ctx.beginPath();
  ctx.roundRect(x, top, CELL, CELL, SWATCH_RADIUS);
  ctx.fill();

  // The panel's swatch border: --input and --border hold the same value, so one
  // stroke covers every branch of its brightness check.
  ctx.strokeStyle = tokens.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, top + 0.5, CELL - 1, CELL - 1, SWATCH_RADIUS);
  ctx.stroke();

  const barsX = x + BARS_PADDING;
  const barsWidth = CELL - BARS_PADDING * 2;
  let y = top + CELL + SWATCH_GAP + BARS_PADDING;

  colorBarGroups(color).forEach((group, index) => {
    if (index > 0) y += GROUP_GAP;
    y = drawGroup(ctx, group, barsX, y, barsWidth, showLabels, tokens);
  });
}

function drawTags(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  originX: number,
  top: number,
  tokens: Tokens
): void {
  ctx.font = `${TAG_SIZE}px ${getCanvasFontStack()}`;
  ctx.textAlign = 'left';
  let x = originX;

  for (const tag of tags) {
    const width = ctx.measureText(tag).width + TAG_PADDING_X * 2;
    ctx.fillStyle = tokens.muted;
    ctx.beginPath();
    ctx.roundRect(x, top, width, TAG_HEIGHT, TAG_RADIUS);
    ctx.fill();

    ctx.fillStyle = tokens.foreground;
    ctx.fillText(tag, x + TAG_PADDING_X, top + TAG_HEIGHT / 2);
    x += width + TAG_GAP;
  }
}

function drawSheet(
  ctx: CanvasRenderingContext2D,
  sheet: PaletteSheet,
  originX: number,
  originY: number,
  tokens: Tokens
): void {
  const showLabels = sheet.showLabels ?? false;
  let y = originY;

  if (sheet.name) {
    ctx.font = `500 ${TITLE_SIZE}px ${getCanvasFontStack()}`;
    ctx.fillStyle = tokens.foreground;
    ctx.textAlign = 'left';
    ctx.fillText(sheet.name, originX, y + TITLE_HEIGHT / 2);
    y += TITLE_HEIGHT + TITLE_GAP;
  }

  if (sheet.tags && sheet.tags.length > 0) {
    drawTags(ctx, sheet.tags, originX, y, tokens);
    y += TAG_HEIGHT + TAG_BLOCK_GAP;
  }

  const columns = columnsOf(sheet);
  const rowHeight = cellHeight(sheet);

  sheet.colors.forEach((color, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawCell(
      ctx,
      color,
      originX + column * (CELL + CELL_GAP),
      y + row * (rowHeight + CELL_GAP),
      showLabels,
      tokens
    );
  });
}

/**
 * Renders palettes stacked into one PNG.
 *
 * The webfont is awaited first: canvas silently substitutes a font that has not
 * finished loading, and unlike a mis-rendered screen, the result is kept as a
 * file.
 */
export async function renderPaletteSheets(sheets: PaletteSheet[]): Promise<Blob> {
  await ensureCanvasFontLoaded();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');

  const tokens = readTokens();
  ctx.font = `500 ${TITLE_SIZE}px ${getCanvasFontStack()}`;
  const contentWidth = Math.max(
    ...sheets.map((sheet) =>
      Math.max(gridWidth(sheet), sheet.name ? ctx.measureText(sheet.name).width : 0)
    )
  );
  const width = Math.ceil(contentWidth) + PADDING * 2;
  const height =
    sheets.reduce((total, sheet) => total + sheetHeight(sheet), 0) +
    (sheets.length - 1) * SHEET_GAP +
    PADDING * 2;

  canvas.width = Math.round(width * SCALE);
  canvas.height = Math.round(height * SCALE);
  ctx.scale(SCALE, SCALE);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = tokens.background;
  ctx.fillRect(0, 0, width, height);

  let y = PADDING;
  for (const sheet of sheets) {
    drawSheet(ctx, sheet, PADDING, y, tokens);
    y += sheetHeight(sheet) + SHEET_GAP;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob'));
    }, 'image/png');
  });
}
