import type { PolygonSelection, SelectionMask, Point } from '@/lib/selection-tools';
import type { ColorAnnotation } from '@/lib/export-formats';
import { drawAnnotationLabel, type AnnotationColorSpace } from '@/lib/annotation-render';

export interface SelectionRect {
  start: Point;
  end: Point;
}

export interface CanvasDrawParams {
  image: HTMLImageElement;
  scale: number;
  offset: Point;
  selection: SelectionRect | null;
  dragSelection: SelectionRect | null;
  selectionMode: 'rectangle' | 'polygon' | 'point';
  polygonSelection: PolygonSelection;
  currentMask: SelectionMask | null;
  isGreyscale: boolean;
  annotations: ColorAnnotation[];
  annotationLineOpacity: number;
  annotationFontSize: number;
  annotationTheme: 'light' | 'dark';
  annotationLineColor: string;
  annotationColorSpace: AnnotationColorSpace;
  isAnnotating: boolean;
  annotationAnchorImg: Point | null;
  annotationPreviewImg: Point | null;
}

/**
 * Renders one frame onto `canvas`: the (optionally grayscale-filtered)
 * image, the active rectangle/polygon selection UI, the polygon mask
 * overlay, confirmed annotations, and the in-progress annotation preview
 * line. Pure with respect to React — all inputs are passed in, nothing is
 * read from component state directly — so it can be unit/visually verified
 * independently of ImageCanvas's event-handling logic.
 */
export function drawCanvasFrame(canvas: HTMLCanvasElement, params: CanvasDrawParams): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    image,
    scale,
    offset,
    selection,
    dragSelection,
    selectionMode,
    polygonSelection,
    currentMask,
    isGreyscale,
    annotations,
    annotationLineOpacity,
    annotationFontSize,
    annotationTheme,
    annotationLineColor,
    annotationColorSpace,
    isAnnotating,
    annotationAnchorImg,
    annotationPreviewImg,
  } = params;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply grayscale filter if enabled
  if (isGreyscale) {
    ctx.filter = 'grayscale(100%)';
  } else {
    ctx.filter = 'none';
  }

  // Draw image
  const displayWidth = image.width * scale;
  const displayHeight = image.height * scale;
  ctx.drawImage(image, offset.x, offset.y, displayWidth, displayHeight);

  // Reset filter for UI elements
  ctx.filter = 'none';

  // Draw selection rectangle
  const currentSelection = selection || dragSelection;
  if (currentSelection) {
    const { start, end } = currentSelection;
    const rect = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };

    // Draw selection overlay only for confirmed selection (not during drag)
    if (selection) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Clear selected area and redraw image for confirmed selection only
    if (selection) {
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height);

      // Redraw image in selected area only
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();

      // Apply grayscale filter if enabled
      if (isGreyscale) {
        ctx.filter = 'grayscale(100%)';
      }

      ctx.drawImage(image, offset.x, offset.y, displayWidth, displayHeight);
      ctx.restore();
    }

    // Draw clean selection border with drop shadow effect
    ctx.lineWidth = 2;

    // Draw shadow border (offset)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width, rect.height);

    // Draw main border
    ctx.strokeStyle = '#ffffff'; // White border
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    // Draw modern corner handles
    const handleSize = 6;
    const positions = [
      [rect.x, rect.y], // Top-left
      [rect.x + rect.width, rect.y], // Top-right
      [rect.x, rect.y + rect.height], // Bottom-left
      [rect.x + rect.width, rect.y + rect.height] // Bottom-right
    ];

    positions.forEach(([x, y]) => {
      // Handle shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x - handleSize / 2 + 1, y - handleSize / 2 + 1, handleSize, handleSize);

      // Handle main
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);

    });
  }

  // Draw polygon path
  if (selectionMode === 'polygon' && polygonSelection.getVertices().length > 0) {
    const path = polygonSelection.getVertices();

    // Draw clean polygon border
    ctx.lineWidth = 2;

    // Draw polygon path with shadow
    ctx.beginPath();
    const firstPoint = path[0];
    const scaledFirstX = firstPoint.x * scale + offset.x;
    const scaledFirstY = firstPoint.y * scale + offset.y;
    ctx.moveTo(scaledFirstX + 1, scaledFirstY + 1);

    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      const scaledX = point.x * scale + offset.x;
      const scaledY = point.y * scale + offset.y;
      ctx.lineTo(scaledX + 1, scaledY + 1);
    }

    // Close path for completed polygon only
    if (polygonSelection.getIsComplete()) {
      ctx.closePath();
    }

    // Draw shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.stroke();

    // Draw main path
    ctx.beginPath();
    ctx.moveTo(scaledFirstX, scaledFirstY);

    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      const scaledX = point.x * scale + offset.x;
      const scaledY = point.y * scale + offset.y;
      ctx.lineTo(scaledX, scaledY);
    }

    if (polygonSelection.getIsComplete()) {
      ctx.closePath();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw modern vertex points
    for (const point of path) {
      const scaledX = point.x * scale + offset.x;
      const scaledY = point.y * scale + offset.y;

      // Vertex shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(scaledX + 1, scaledY + 1, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Vertex main
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(scaledX, scaledY, 4, 0, 2 * Math.PI);
      ctx.fill();

    }

    // Highlight first point for closing hint
    if (path.length > 2 && !polygonSelection.getIsComplete()) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(scaledFirstX, scaledFirstY, 8, 0, 2 * Math.PI);
      ctx.stroke();

    }
  }

  // Draw polygon selection mask (darken unselected areas)
  if (currentMask && selectionMode === 'polygon') {
    // Create inverted mask overlay
    const overlayImageData = ctx.createImageData(currentMask.width, currentMask.height);

    for (let i = 0; i < currentMask.data.length; i++) {
      const alpha = currentMask.data[i];
      const pixelIndex = i * 4;

      // Invert the mask: darken areas that are NOT selected
      if (alpha === 0) {
        overlayImageData.data[pixelIndex] = 0;     // R
        overlayImageData.data[pixelIndex + 1] = 0; // G
        overlayImageData.data[pixelIndex + 2] = 0; // B
        overlayImageData.data[pixelIndex + 3] = 128; // A - Semi-transparent overlay
      } else {
        overlayImageData.data[pixelIndex] = 0;
        overlayImageData.data[pixelIndex + 1] = 0;
        overlayImageData.data[pixelIndex + 2] = 0;
        overlayImageData.data[pixelIndex + 3] = 0; // Transparent for selected areas
      }
    }

    // Create temporary canvas for overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentMask.width;
    tempCanvas.height = currentMask.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(overlayImageData, 0, 0);

      // Draw the overlay to darken unselected areas
      ctx.drawImage(
        tempCanvas,
        offset.x,
        offset.y,
        currentMask.width * scale,
        currentMask.height * scale
      );
    }
  }

  // Draw confirmed annotations (fontSize scales with zoom to maintain image-space ratio)
  for (const annotation of annotations) {
    const ax = annotation.anchorPoint.x * scale + offset.x;
    const ay = annotation.anchorPoint.y * scale + offset.y;
    const lx = annotation.labelPoint.x * scale + offset.x;
    const ly = annotation.labelPoint.y * scale + offset.y;
    drawAnnotationLabel(ctx, {
      color: annotation.color,
      anchor: { x: ax, y: ay },
      label: { x: lx, y: ly },
      lineOpacity: annotationLineOpacity,
      fontSize: annotationFontSize * scale,
      canvasWidth: canvas.width,
      theme: annotationTheme,
      lineColor: annotationLineColor,
      colorSpace: annotationColorSpace,
      opaqueBg: true,
    });
  }

  // Draw annotation preview (while dragging)
  if (isAnnotating && annotationAnchorImg && annotationPreviewImg) {
    const ax = annotationAnchorImg.x * scale + offset.x;
    const ay = annotationAnchorImg.y * scale + offset.y;
    const lx = annotationPreviewImg.x * scale + offset.x;
    const ly = annotationPreviewImg.y * scale + offset.y;

    ctx.save();
    ctx.globalAlpha = annotationLineOpacity;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lx, ly);
    ctx.strokeStyle = annotationLineColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
