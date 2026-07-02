import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Point } from '@/lib/selection-tools';

/**
 * Owns the canvas viewport: scale/offset (pan+zoom) and the fit-to-container/
 * actual-size/zoom operations. Pointer-driven interactions (drag selection,
 * pinch-zoom, etc.) still live in ImageCanvas and use the setScale/setOffset
 * setters returned here directly, since those gestures are pointer-handling
 * concerns, not viewport concerns.
 */
export function useCanvasViewport(
  image: HTMLImageElement | null,
  canvasRef: RefObject<HTMLCanvasElement>,
  containerRef: RefObject<HTMLDivElement>
) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [minScale] = useState(0.1);
  const [maxScale] = useState(5);

  // Fit image to container with proper scaling
  const fitImageToContainer = useCallback(() => {
    if (!image || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Calculate scale to fit container with padding
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const padding = 32; // 16px padding on all sides = 32px total

    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;

    const scaleX = availableWidth / image.width;
    const scaleY = availableHeight / image.height;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up initially

    setScale(newScale);

    // Center image
    const displayWidth = image.width * newScale;
    const displayHeight = image.height * newScale;
    setOffset({
      x: (containerWidth - displayWidth) / 2,
      y: (containerHeight - displayHeight) / 2,
    });

    canvas.width = containerWidth;
    canvas.height = containerHeight;
  }, [image, canvasRef, containerRef]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (image) {
        fitImageToContainer();
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [image, fitImageToContainer, containerRef]);

  // Convert screen coordinates to image coordinates
  const screenToImageCoords = useCallback((screenX: number, screenY: number): Point => {
    const imageX = (screenX - offset.x) / scale;
    const imageY = (screenY - offset.y) / scale;
    return { x: imageX, y: imageY };
  }, [scale, offset]);

  // Zoom functionality
  const handleZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));

    if (newScale !== scale) {
      // Get the image coordinate at the mouse position
      const imagePoint = screenToImageCoords(centerX, centerY);

      // Calculate where this image coordinate will be displayed with the new scale
      const newImageX = imagePoint.x * newScale;
      const newImageY = imagePoint.y * newScale;

      // Adjust offset to keep the mouse position fixed
      setOffset({
        x: centerX - newImageX,
        y: centerY - newImageY,
      });
      setScale(newScale);
    }
  }, [scale, minScale, maxScale, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom to actual size (100%)
  const zoomToActualSize = useCallback(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    setScale(1);

    // Center the image
    const displayWidth = image.width;
    const displayHeight = image.height;
    setOffset({
      x: (canvas.width - displayWidth) / 2,
      y: (canvas.height - displayHeight) / 2,
    });
  }, [image, canvasRef]);

  return {
    scale,
    setScale,
    offset,
    setOffset,
    minScale,
    maxScale,
    fitImageToContainer,
    screenToImageCoords,
    handleZoom,
    zoomToActualSize,
  };
}
