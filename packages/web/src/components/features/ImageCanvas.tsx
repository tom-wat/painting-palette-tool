import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, Tooltip } from '../ui';
import {
  PolygonSelection,
  extractImageDataFromMask,
  type SelectionMask,
  type Point
} from '@/lib/selection-tools';
import { type SelectionMode } from './AdvancedSelectionTools';
import { rgbToGrayscale } from '@palette-tool/color-engine';
import { type ColorAnnotation } from '@/lib/export-formats';
import { type AnnotationColorSpace } from '@/lib/annotation-render';
import { drawCanvasFrame, type SelectionRect } from '@/lib/canvas-draw';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';

// ─── Touch configuration ───────────────────────────────────────────────────
// Pinch zoom sensitivity. 1.0 = natural linear, >1.0 = more sensitive, <1.0 = less sensitive.
// Implemented as an exponent: newScale = startScale * rawRatio^PINCH_ZOOM_SENSITIVITY
const PINCH_ZOOM_SENSITIVITY = 1.2;

// Minimum finger movement (px) before a single-finger touch is treated as a pan
// rather than a tap/selection-start in rect/polygon mode.
const TOUCH_PAN_THRESHOLD = 8;

// Minimum rectangle selection size (px, screen coords) to trigger color extraction.
// Prevents accidental tiny selections from a tap or slight finger movement.
const MIN_RECT_SELECTION_SIZE = 12;
// ───────────────────────────────────────────────────────────────────────────

interface ImageCanvasProps {
  imageFile: File;
  onSelectionChange: (_imageData: ImageData | null) => void;
  onPointColorAdd?: (_color: { r: number, g: number, b: number }) => void;
  selectionMode: SelectionMode;
  onClearSelection?: (_clearFn: () => void) => void;
  className?: string;
  isGreyscale?: boolean;
  annotations?: ColorAnnotation[];
  onAnnotationsChange?: (_annotations: ColorAnnotation[]) => void;
  annotationMode?: 'pick' | 'annotate';
  annotationLineOpacity?: number;
  annotationFontSize?: number;
  annotationTheme?: 'light' | 'dark';
  annotationLineColor?: string;
  annotationColorSpace?: AnnotationColorSpace;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function ImageCanvas({
  imageFile,
  onSelectionChange,
  onPointColorAdd,
  selectionMode,
  onClearSelection,
  className = '',
  isGreyscale = false,
  annotations = [],
  onAnnotationsChange,
  annotationMode = 'pick',
  annotationLineOpacity = 0.7,
  annotationFontSize = 16,
  annotationTheme = 'dark',
  annotationLineColor = '#ffffff',
  annotationColorSpace = 'hscl',
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [dragSelection, setDragSelection] = useState<SelectionRect | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const {
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
  } = useCanvasViewport(image, canvasRef, containerRef);

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [prevPinchCenter, setPrevPinchCenter] = useState<Point | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<Point | null>(null);
  const [isTouchPanning, setIsTouchPanning] = useState(false);

  // Polygon selection state
  const [polygonSelection] = useState(() => new PolygonSelection());
  const [currentMask, setCurrentMask] = useState<SelectionMask | null>(null);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);

  // Tooltip state for point mode
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipColor, setTooltipColor] = useState({ r: 0, g: 0, b: 0 });

  // Tooltip performance optimization refs
  const tooltipDebounceRef = useRef<number | null>(null);
  const tooltipThrottleRef = useRef<number>(0);

  // Annotation state
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationAnchorImg, setAnnotationAnchorImg] = useState<Point | null>(null);
  const [annotationPreviewImg, setAnnotationPreviewImg] = useState<Point | null>(null);

  // Load and display image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      fitImageToContainer();

      // Extract source ImageData for advanced selection tools
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        setSourceImageData(imageData);

      }
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  // Draw canvas with image and selection
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image) return;

    drawCanvasFrame(canvasRef.current, {
      image, scale, offset, selection, dragSelection, selectionMode, polygonSelection,
      currentMask, isGreyscale,
      annotations, annotationLineOpacity, annotationFontSize, annotationTheme, annotationLineColor, annotationColorSpace,
      isAnnotating, annotationAnchorImg, annotationPreviewImg,
    });
  }, [
    image, scale, offset, selection, dragSelection, selectionMode, polygonSelection,
    currentMask, isDrawing, isGreyscale,
    annotations, annotationLineOpacity, annotationFontSize, annotationTheme, annotationLineColor, annotationColorSpace,
    isAnnotating, annotationAnchorImg, annotationPreviewImg,
  ]);

  // Reset view to fit image in container
  const resetView = useCallback(() => {
    fitImageToContainer();
    setSelection(null);
    onSelectionChange(null);
  }, [fitImageToContainer, onSelectionChange]);

  // Redraw when selection changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Get touch position relative to canvas
  const getTouchPos = useCallback((e: TouchEvent, touchIndex: number = 0): Point => {
    if (!canvasRef.current || !e.touches[touchIndex]) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[touchIndex];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  // Calculate distance between two touches
  const getTouchDistance = useCallback((e: TouchEvent): number => {
    if (e.touches.length < 2) return 0;

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    const deltaX = touch2.clientX - touch1.clientX;
    const deltaY = touch2.clientY - touch1.clientY;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }, []);

  // Get center point between two touches
  const getTouchCenter = useCallback((e: TouchEvent): Point => {
    if (e.touches.length < 2) return getTouchPos(e, 0);

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) return { x: 0, y: 0 };

    return {
      x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
      y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
    };
  }, [getTouchPos]);

  // Extract ImageData from rectangle selection
  const extractSelectionDataFromRect = useCallback((rectSelection: SelectionRect) => {
    if (!image) return;

    const { start, end } = rectSelection;
    const imageStart = screenToImageCoords(Math.min(start.x, end.x), Math.min(start.y, end.y));
    const imageEnd = screenToImageCoords(Math.max(start.x, end.x), Math.max(start.y, end.y));

    // Clamp to image bounds
    const x = Math.max(0, Math.floor(imageStart.x));
    const y = Math.max(0, Math.floor(imageStart.y));
    const width = Math.min(image.width - x, Math.ceil(imageEnd.x - imageStart.x));
    const height = Math.min(image.height - y, Math.ceil(imageEnd.y - imageStart.y));

    if (width <= 0 || height <= 0) {
      onSelectionChange(null);
      return;
    }

    // Create temporary canvas for extraction
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw selected portion of image
    tempCtx.drawImage(image, x, y, width, height, 0, 0, width, height);

    // Extract ImageData
    const imageData = tempCtx.getImageData(0, 0, width, height);
    onSelectionChange(imageData);
  }, [image, screenToImageCoords, onSelectionChange]);

  // Extract ImageData from selection
  const extractSelectionData = useCallback(() => {
    if (!sourceImageData) return;

    // Rectangle selection
    if (selectionMode === 'rectangle' && selection) {
      extractSelectionDataFromRect(selection);
      return;
    }

    // Polygon selection
    if (selectionMode === 'polygon' && polygonSelection.getIsComplete()) {
      const mask = polygonSelection.generateMask(sourceImageData.width, sourceImageData.height);
      const extractedData = extractImageDataFromMask(sourceImageData, mask);
      onSelectionChange(extractedData);
      return;
    }

    if (currentMask && selectionMode === 'polygon') {
      const extractedData = extractImageDataFromMask(sourceImageData, currentMask);
      onSelectionChange(extractedData);
      return;
    }

    // No selection
    onSelectionChange(null);
  }, [
    selection,
    sourceImageData,
    selectionMode,
    polygonSelection,
    currentMask,
    onSelectionChange,
    extractSelectionDataFromRect
  ]);

  // Extract color at specific pixel
  const extractPixelColor = useCallback((imageX: number, imageY: number): {r: number, g: number, b: number} | null => {
    if (!sourceImageData || !image) return null;

    // Clamp coordinates to image bounds
    const x = Math.max(0, Math.min(Math.floor(imageX), image.width - 1));
    const y = Math.max(0, Math.min(Math.floor(imageY), image.height - 1));

    const index = (y * sourceImageData.width + x) * 4;

    let color = {
      r: sourceImageData.data[index],
      g: sourceImageData.data[index + 1],
      b: sourceImageData.data[index + 2]
    };

    // Apply grayscale conversion if enabled
    if (isGreyscale) {
      color = rgbToGrayscale(color);
    }

    return color;
  }, [sourceImageData, image, isGreyscale]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    // Hide tooltip immediately on any click
    if (tooltipDebounceRef.current) {
      clearTimeout(tooltipDebounceRef.current);
      tooltipDebounceRef.current = null;
    }
    setTooltipVisible(false);

    if (e.shiftKey) {
      // Pan mode
      setIsPanning(true);
      setLastPanPoint(pos);
      return;
    }

    const imagePos = screenToImageCoords(pos.x, pos.y);

    switch (selectionMode) {
      case 'rectangle':
        // Clear previous confirmed selection to show new drag selection
        setSelection(null);
        setIsDrawing(true);
        setDragSelection({ start: pos, end: pos });
        break;

      case 'polygon':
        // If polygon is already complete, start a new one
        if (polygonSelection.getIsComplete()) {
          polygonSelection.clear();
          setCurrentMask(null);
          setIsDrawing(false);
        }

        // Check if clicking near the first point to close polygon
        if (polygonSelection.getVertices().length > 2) {
          const firstPoint = polygonSelection.getVertices()[0];
          const scaledFirstX = firstPoint.x * scale + offset.x;
          const scaledFirstY = firstPoint.y * scale + offset.y;
          const distance = Math.sqrt(
            Math.pow(pos.x - scaledFirstX, 2) + Math.pow(pos.y - scaledFirstY, 2)
          );

          if (distance < 15) { // Close polygon if clicked near first point
            polygonSelection.complete();
            setIsDrawing(false);
            const mask = polygonSelection.generateMask(sourceImageData?.width || 0, sourceImageData?.height || 0);
            setCurrentMask(mask);
            extractSelectionData();
            drawCanvas();
            break;
          }
        }

        // Add new point to polygon
        polygonSelection.addVertex(imagePos);
        setIsDrawing(true);
        drawCanvas();
        break;

      case 'point': {
        if (annotationMode === 'annotate') {
          // Start annotation drag
          setAnnotationAnchorImg(imagePos);
          setAnnotationPreviewImg(imagePos);
          setIsAnnotating(true);
        } else {
          // Pick mode: extract color and add to palette
          const color = extractPixelColor(imagePos.x, imagePos.y);
          if (color && onPointColorAdd) {
            onPointColorAdd(color);
          }
        }
        break;
      }
    }
  }, [
    getMousePos, selectionMode, sourceImageData, polygonSelection, scale, offset,
    screenToImageCoords, extractSelectionData, drawCanvas, extractPixelColor,
    onPointColorAdd, annotationMode,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (isPanning && lastPanPoint) {
      // Pan the image
      const deltaX = pos.x - lastPanPoint.x;
      const deltaY = pos.y - lastPanPoint.y;

      setOffset((prev: Point) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastPanPoint(pos);
      return;
    }

    // Handle annotation drag preview
    if (isAnnotating && annotationAnchorImg) {
      const imagePos = screenToImageCoords(pos.x, pos.y);
      setAnnotationPreviewImg(imagePos);
      return;
    }

    // Handle tooltip for point mode with throttle and minimal debounce
    if (selectionMode === 'point' && !isDrawing && !isPanning && !isAnnotating) {
      // Throttle: Limit updates to every 16ms (~60fps) for performance
      const now = Date.now();
      if (now - tooltipThrottleRef.current < 16) {
        return;
      }
      tooltipThrottleRef.current = now;

      const updateTooltip = () => {
        const imagePos = screenToImageCoords(pos.x, pos.y);
        const color = extractPixelColor(imagePos.x, imagePos.y);

        if (color && imagePos.x >= 0 && imagePos.y >= 0 && image &&
            imagePos.x < image.width && imagePos.y < image.height) {
          // Convert canvas coordinates to page coordinates
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltipPosition({
              x: rect.left + pos.x,
              y: rect.top + pos.y
            });
            setTooltipColor(color);
            setTooltipVisible(true);
          }
        } else {
          setTooltipVisible(false);
        }
      };

      // Immediate update for responsive feedback
      updateTooltip();

      // Clear any existing debounce timeout
      if (tooltipDebounceRef.current) {
        clearTimeout(tooltipDebounceRef.current);
      }

      // Short debounce for final stabilization (50ms)
      tooltipDebounceRef.current = setTimeout(updateTooltip, 50) as unknown as number;
    } else {
      // Clear debounce timeout and hide tooltip immediately
      if (tooltipDebounceRef.current) {
        clearTimeout(tooltipDebounceRef.current);
        tooltipDebounceRef.current = null;
      }
      setTooltipVisible(false);
    }

    if (!isDrawing) return;

    switch (selectionMode) {
      case 'rectangle':
        if (dragSelection) {
          setDragSelection(prev => prev ? { ...prev, end: pos } : null);
        }
        break;

      case 'polygon':
        // For polygon, we only add points on click, not on move
        // Just redraw to show current mouse position if needed
        break;
    }
  }, [
    isDrawing, dragSelection, isPanning, lastPanPoint, getMousePos, selectionMode,
    screenToImageCoords, extractPixelColor, image,
    isAnnotating, annotationAnchorImg, setOffset,
  ]);

  const handleMouseUp = useCallback(() => {
    // Complete annotation if dragging
    if (isAnnotating && annotationAnchorImg && annotationPreviewImg) {
      const ax = annotationAnchorImg.x * scale + offset.x;
      const ay = annotationAnchorImg.y * scale + offset.y;
      const lx = annotationPreviewImg.x * scale + offset.x;
      const ly = annotationPreviewImg.y * scale + offset.y;
      const dist = Math.sqrt(Math.pow(lx - ax, 2) + Math.pow(ly - ay, 2));

      if (dist > 10) {
        const color = extractPixelColor(annotationAnchorImg.x, annotationAnchorImg.y);
        if (color && onAnnotationsChange) {
          const newAnnotation: ColorAnnotation = {
            id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            anchorPoint: { ...annotationAnchorImg },
            labelPoint: { ...annotationPreviewImg },
            color,
          };
          onAnnotationsChange([...annotations, newAnnotation]);
        }
      }

      setIsAnnotating(false);
      setAnnotationAnchorImg(null);
      setAnnotationPreviewImg(null);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);

      switch (selectionMode) {
        case 'rectangle':
          // Confirm dragSelection as selection and extract data
          if (dragSelection) {
            setSelection(dragSelection);
            setDragSelection(null);
            // Extract data using dragSelection directly since state update is async
            extractSelectionDataFromRect(dragSelection);
          }
          break;

        case 'polygon':
          // For polygon, mouse up doesn't complete selection
          // Selection is completed by clicking near first point or double-click
          break;
      }
    }

    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
    }
  }, [
    isDrawing, isPanning, selectionMode, dragSelection, extractSelectionDataFromRect,
    isAnnotating, annotationAnchorImg, annotationPreviewImg,
    scale, offset, extractPixelColor, onAnnotationsChange, annotations,
  ]);


  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
    setDragSelection(null);
    setCurrentMask(null);
    polygonSelection.clear();
    setIsDrawing(false);
    onSelectionChange(null);
    drawCanvas();
  }, [polygonSelection, onSelectionChange, drawCanvas]);

  // Provide clear function to parent
  useEffect(() => {
    if (onClearSelection) {
      onClearSelection(clearSelection);
    }
  }, [clearSelection, onClearSelection]);

  // Clear selection progress when selection mode changes
  const previousSelectionMode = useRef<SelectionMode>(selectionMode);
  useEffect(() => {
    if (previousSelectionMode.current !== selectionMode) {
      setSelection(null);
      setDragSelection(null);
      setCurrentMask(null);
      polygonSelection.clear();
      setIsDrawing(false);
      // Clear tooltip debounce timeout when mode changes
      if (tooltipDebounceRef.current) {
        clearTimeout(tooltipDebounceRef.current);
        tooltipDebounceRef.current = null;
      }
      setTooltipVisible(false);
      onSelectionChange(null);
      drawCanvas();
      previousSelectionMode.current = selectionMode;
    }
  }, [selectionMode, polygonSelection, onSelectionChange, drawCanvas]);

  // Cancel in-progress annotation when annotationMode changes
  useEffect(() => {
    if (isAnnotating) {
      setIsAnnotating(false);
      setAnnotationAnchorImg(null);
      setAnnotationPreviewImg(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationMode]);


  // Handle double click to complete polygon
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (selectionMode === 'polygon') {
      e.preventDefault();

      // If polygon is already complete, start a new one (same as single click)
      if (polygonSelection.getIsComplete()) {
        polygonSelection.clear();
        setCurrentMask(null);
        setIsDrawing(false);
        drawCanvas();
        return;
      }

      // Complete current polygon if it has enough vertices
      if (polygonSelection.getVertices().length > 2) {
        polygonSelection.complete();
        setIsDrawing(false);
        const mask = polygonSelection.generateMask(sourceImageData?.width || 0, sourceImageData?.height || 0);
        setCurrentMask(mask);
        extractSelectionData();
        drawCanvas();
      }
    }
  }, [selectionMode, polygonSelection, sourceImageData, extractSelectionData, drawCanvas]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;

      // Clear selection: Escape (only if no modal is open)
      if (e.key === 'Escape') {
        // Check if any modal is currently open
        const hasOpenModal = document.querySelector('[role="dialog"]');
        if (!hasOpenModal) {
          e.preventDefault();
          clearSelection();
        }
      }

    };

    document.addEventListener('keydown', handleKeyboard);
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, [clearSelection]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const pos = getTouchPos(e, 0);
      setTouchStartPos(pos);
      setIsTouchPanning(false);

      // Annotation mode: start annotation drag
      if (selectionMode === 'point' && annotationMode === 'annotate') {
        const imagePos = screenToImageCoords(pos.x, pos.y);
        setAnnotationAnchorImg(imagePos);
        setAnnotationPreviewImg(imagePos);
        setIsAnnotating(true);
        return;
      }

      // Point pick: defer to touchEnd (tap = pick, drag = pan)
      if (selectionMode === 'point') {
        return;
      }

      // Rectangle: start drag selection
      if (selectionMode === 'rectangle') {
        setSelection(null);
        setDragSelection({ start: pos, end: pos });
        setIsDrawing(true);
        return;
      }

      // Polygon: add vertex on tap (handled in touchEnd to distinguish from two-finger)

    } else if (e.touches.length === 2) {
      // Two fingers: start pinch zoom + pan
      const distance = getTouchDistance(e);
      const center = getTouchCenter(e);
      setTouchStartDistance(distance);
      setTouchStartScale(scale);
      setPrevPinchCenter(center);
      setIsDrawing(false);
      setIsAnnotating(false);
      setIsTouchPanning(false);
      setTouchStartPos(null); // Prevent touchEnd from triggering pick/polygon after pinch
    }
  }, [getTouchPos, getTouchDistance, getTouchCenter, scale, selectionMode, annotationMode, screenToImageCoords]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      const pos = getTouchPos(e, 0);

      // Update annotation preview during drag
      if (isAnnotating && annotationAnchorImg) {
        const imagePos = screenToImageCoords(pos.x, pos.y);
        setAnnotationPreviewImg(imagePos);
        return;
      }

      // Pan threshold only applies to point mode (rect/polygon drag = selection, not pan)
      if (selectionMode === 'point' && touchStartPos && !isTouchPanning) {
        const dx = pos.x - touchStartPos.x;
        const dy = pos.y - touchStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > TOUCH_PAN_THRESHOLD) {
          setIsTouchPanning(true);
          setLastPanPoint(pos);
          return;
        }
      }

      // Pan mode
      if (isTouchPanning && lastPanPoint) {
        const dx = pos.x - lastPanPoint.x;
        const dy = pos.y - lastPanPoint.y;
        setOffset((prev: Point) => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastPanPoint(pos);
        return;
      }

      // Update rectangle drag selection
      if (isDrawing && selectionMode === 'rectangle') {
        setDragSelection(prev => prev ? { ...prev, end: pos } : null);
      }

    } else if (e.touches.length === 2 && touchStartDistance) {
      // Pinch zoom with simultaneous two-finger pan
      const currentDistance = getTouchDistance(e);
      const center = getTouchCenter(e);

      // Apply sensitivity via exponent: ratio^sensitivity
      const rawRatio = currentDistance / touchStartDistance;
      const sensitizedRatio = Math.pow(rawRatio, PINCH_ZOOM_SENSITIVITY);
      const newScale = Math.max(minScale, Math.min(maxScale, touchStartScale * sensitizedRatio));

      // Pan delta from previous pinch center
      const panDx = prevPinchCenter ? center.x - prevPinchCenter.x : 0;
      const panDy = prevPinchCenter ? center.y - prevPinchCenter.y : 0;

      const scaleRatio = newScale / scale;
      setOffset((prev: Point) => ({
        x: center.x - (center.x - prev.x) * scaleRatio + panDx,
        y: center.y - (center.y - prev.y) * scaleRatio + panDy,
      }));
      setScale(newScale);
      setPrevPinchCenter(center);
    }
  }, [
    isDrawing, isAnnotating, annotationAnchorImg, selection,
    touchStartDistance, touchStartScale, touchStartPos, isTouchPanning, lastPanPoint,
    prevPinchCenter, scale, minScale, maxScale,
    getTouchPos, getTouchDistance, getTouchCenter, screenToImageCoords,
    setOffset, setScale,
  ]);

  const handleTouchEnd = useCallback(() => {
    // Complete annotation
    if (isAnnotating && annotationAnchorImg && annotationPreviewImg) {
      const ax = annotationAnchorImg.x * scale + offset.x;
      const ay = annotationAnchorImg.y * scale + offset.y;
      const lx = annotationPreviewImg.x * scale + offset.x;
      const ly = annotationPreviewImg.y * scale + offset.y;
      const dist = Math.sqrt((lx - ax) ** 2 + (ly - ay) ** 2);
      if (dist > 5) {
        const color = extractPixelColor(annotationAnchorImg.x, annotationAnchorImg.y);
        if (color && onAnnotationsChange) {
          const newAnnotation: ColorAnnotation = {
            id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            anchorPoint: { ...annotationAnchorImg },
            labelPoint: { ...annotationPreviewImg },
            color,
          };
          onAnnotationsChange([...annotations, newAnnotation]);
        }
      }
      setIsAnnotating(false);
      setAnnotationAnchorImg(null);
      setAnnotationPreviewImg(null);
      return;
    }

    // Point mode tap: pick color (only if didn't pan)
    if (selectionMode === 'point' && !isTouchPanning && touchStartPos) {
      const imagePos = screenToImageCoords(touchStartPos.x, touchStartPos.y);
      const color = extractPixelColor(imagePos.x, imagePos.y);
      if (color && onPointColorAdd) {
        onPointColorAdd(color);
      }
    }

    // Rectangle: confirm drag selection only if large enough
    if (selectionMode === 'rectangle' && isDrawing) {
      setIsDrawing(false);
      if (dragSelection) {
        const w = Math.abs(dragSelection.end.x - dragSelection.start.x);
        const h = Math.abs(dragSelection.end.y - dragSelection.start.y);
        if (w >= MIN_RECT_SELECTION_SIZE && h >= MIN_RECT_SELECTION_SIZE) {
          setSelection(dragSelection);
          extractSelectionDataFromRect(dragSelection);
        }
        setDragSelection(null);
      }
    }

    // Polygon: add vertex on tap (single-finger touchend without 2-finger interference)
    if (selectionMode === 'polygon' && touchStartPos && !isTouchPanning) {
      const pos = touchStartPos;
      const imagePos = screenToImageCoords(pos.x, pos.y);

      if (polygonSelection.getIsComplete()) {
        polygonSelection.clear();
        setCurrentMask(null);
        setIsDrawing(false);
      } else if (polygonSelection.getVertices().length > 2) {
        const firstPoint = polygonSelection.getVertices()[0]!;
        const scaledFirstX = firstPoint.x * scale + offset.x;
        const scaledFirstY = firstPoint.y * scale + offset.y;
        const dist = Math.sqrt((pos.x - scaledFirstX) ** 2 + (pos.y - scaledFirstY) ** 2);
        if (dist < 20) {
          // Close polygon
          polygonSelection.complete();
          setIsDrawing(false);
          const mask = polygonSelection.generateMask(sourceImageData?.width || 0, sourceImageData?.height || 0);
          setCurrentMask(mask);
          extractSelectionData();
          drawCanvas();
        } else {
          polygonSelection.addVertex(imagePos);
          setIsDrawing(true);
          drawCanvas();
        }
      } else {
        polygonSelection.addVertex(imagePos);
        setIsDrawing(true);
        drawCanvas();
      }
    }

    setTouchStartDistance(null);
    setTouchStartScale(1);
    setPrevPinchCenter(null);
    setTouchStartPos(null);
    setIsTouchPanning(false);
    setLastPanPoint(null);
  }, [
    isAnnotating, annotationAnchorImg, annotationPreviewImg, scale, offset,
    extractPixelColor, onAnnotationsChange, annotations, isDrawing, extractSelectionData,
    extractSelectionDataFromRect, selectionMode, isTouchPanning, touchStartPos,
    screenToImageCoords, onPointColorAdd, dragSelection, polygonSelection,
    sourceImageData, drawCanvas,
  ]);

  // Handle wheel events for zoom (registered as non-passive via useEffect)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const pos = getMousePos(e as any);
    const delta = -e.deltaY; // Invert to make scroll up = zoom in

    handleZoom(delta, pos.x, pos.y);
  }, [getMousePos, handleZoom]);

  // Register touch and wheel event listeners as non-passive so preventDefault works
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  return (
    <Card className={className}>
      <CardContent className="p-3 lg:p-6 flex-1 flex flex-col">
        <div className="flex-1 flex flex-col space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="hidden lg:block text-lg font-semibold">Image Canvas</h3>
          <div className="flex items-center space-x-2 ml-auto">
            <div className="text-xs text-gray-500">
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={() => {
                if (!canvasRef.current) return;
                const canvas = canvasRef.current;
                handleZoom(-100, canvas.width / 2, canvas.height / 2);
              }}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              title="Zoom out (-)"
            >
              −
            </button>
            <button
              onClick={() => {
                if (!canvasRef.current) return;
                const canvas = canvasRef.current;
                handleZoom(100, canvas.width / 2, canvas.height / 2);
              }}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              title="Zoom in (+)"
            >
              +
            </button>
            <button
              onClick={resetView}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              title="Fit to container (F)"
            >
              Fit
            </button>
            <button
              onClick={zoomToActualSize}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              title="Actual size (1)"
            >
              100%
            </button>
            {(selectionMode === 'rectangle' || selectionMode === 'polygon') && (
              <button
                onClick={clearSelection}
                disabled={!(selection || currentMask || polygonSelection.getIsComplete())}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-white"
                title="Clear selection (ESC)"
              >
                Clear
              </button>
            )}
            {annotationMode === 'annotate' && (
              <>
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-white"
                  title="Undo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6"/>
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                  </svg>
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-white"
                  title="Redo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 7v6h-6"/>
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden flex-1 min-h-0"
          style={{ minHeight: 'min(400px, 40vh)' }}
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 ${
              isPanning
                ? 'cursor-move'
                : isAnnotating
                  ? 'cursor-crosshair'
                  : 'cursor-crosshair'
            } touch-none`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isAnnotating) {
                setIsAnnotating(false);
                setAnnotationAnchorImg(null);
                setAnnotationPreviewImg(null);
              }
              handleMouseUp();
              // Clear debounce timeout and hide tooltip immediately
              if (tooltipDebounceRef.current) {
                clearTimeout(tooltipDebounceRef.current);
                tooltipDebounceRef.current = null;
              }
              setTooltipVisible(false);
            }}
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => {
              e.preventDefault(); // Prevent context menu
            }}
          />
        </div>

        <div className="hidden lg:block text-sm text-gray-600 space-y-1">
          {selectionMode === 'rectangle' && selection ? (
            <p>
              Selection: {Math.abs(selection.end.x - selection.start.x).toFixed(0)} × {Math.abs(selection.end.y - selection.start.y).toFixed(0)} px
            </p>
          ) : selectionMode === 'polygon' && polygonSelection.getVertices().length > 0 ? (
            <p>
              Polygon path: {polygonSelection.getVertices().length} points • {polygonSelection.getIsComplete() ? 'Selection completed - extracting colors' : 'Click near first point or double-click to complete'}
            </p>
          ) : selectionMode === 'point' && annotationMode === 'annotate' ? (
            <p>Click and drag on the image to add color annotations</p>
          ) : selectionMode === 'point' ? (
            <p>Click anywhere on the image to add colors to your palette</p>
          ) : (
            <p>Click and drag to select an area for color extraction</p>
          )}
          <p className="text-xs text-gray-500">
            <span className="hidden sm:inline">
              Controls: Scroll wheel to zoom • Shift + drag to pan • ESC to clear selection
            </span>
            <span className="sm:hidden">
              Touch: Tap and drag to select • Two fingers to zoom and pan
            </span>
          </p>
        </div>
        </div>
      </CardContent>

      {/* Tooltip for point mode - positioned relative to page */}
      <Tooltip
        x={tooltipPosition.x}
        y={tooltipPosition.y}
        color={tooltipColor}
        visible={tooltipVisible && selectionMode === 'point' && !isAnnotating}
      />
    </Card>
  );
}
