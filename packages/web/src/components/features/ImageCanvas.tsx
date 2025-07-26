import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../ui';
import { 
  PolygonSelection,
  extractImageDataFromMask,
  type SelectionMask,
  type Point
} from '@/lib/selection-tools';
import { type SelectionMode } from './AdvancedSelectionTools';

interface SelectionRect {
  start: Point;
  end: Point;
}

interface ImageCanvasProps {
  imageFile: File;
  onSelectionChange: (_imageData: ImageData | null) => void;
  selectionMode: SelectionMode;
  onClearSelection?: (_clearFn: () => void) => void;
  className?: string;
}

export default function ImageCanvas({
  imageFile,
  onSelectionChange,
  selectionMode,
  onClearSelection,
  className = '',
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [dragSelection, setDragSelection] = useState<SelectionRect | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [minScale] = useState(0.1);
  const [maxScale] = useState(5);
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState(1);

  // Polygon selection state
  const [polygonSelection] = useState(() => new PolygonSelection());
  const [currentMask, setCurrentMask] = useState<SelectionMask | null>(null);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);

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
  }, [image]);

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
  }, [image, fitImageToContainer]);

  // Draw canvas with image and selection
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    const displayWidth = image.width * scale;
    const displayHeight = image.height * scale;
    ctx.drawImage(image, offset.x, offset.y, displayWidth, displayHeight);
    
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
      
      // Draw preview line to first point if drawing
      if (isDrawing && !polygonSelection.getIsComplete() && path.length > 2) {
        ctx.lineTo(scaledFirstX + 1, scaledFirstY + 1);
      }
      
      // Close path for completed polygon
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
      
      if (isDrawing && !polygonSelection.getIsComplete() && path.length > 2) {
        ctx.lineTo(scaledFirstX, scaledFirstY);
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
  }, [image, scale, offset, selection, dragSelection, selectionMode, polygonSelection, currentMask, isDrawing]);

  // Zoom functionality
  const handleZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    const zoomFactor = delta > 0 ? 1.2 : 0.8;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));
    
    if (newScale !== scale) {
      // Zoom towards the cursor position
      const scaleRatio = newScale / scale;
      setOffset((prev: Point) => ({
        x: centerX - (centerX - prev.x) * scaleRatio,
        y: centerY - (centerY - prev.y) * scaleRatio,
      }));
      setScale(newScale);
    }
  }, [scale, minScale, maxScale]);

  // Reset view to fit image in container
  const resetView = useCallback(() => {
    fitImageToContainer();
    setSelection(null);
    onSelectionChange(null);
  }, [fitImageToContainer, onSelectionChange]);

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
  }, [image]);

  // Redraw when selection changes
  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [selection, dragSelection, image, scale, offset, currentMask, polygonSelection, selectionMode]);

  // Convert screen coordinates to image coordinates
  const screenToImageCoords = useCallback((screenX: number, screenY: number): Point => {
    const imageX = (screenX - offset.x) / scale;
    const imageY = (screenY - offset.y) / scale;
    return { x: imageX, y: imageY };
  }, [scale, offset]);

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
  const getTouchPos = useCallback((e: React.TouchEvent, touchIndex: number = 0): Point => {
    if (!canvasRef.current || !e.touches[touchIndex]) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[touchIndex];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  // Calculate distance between two touches
  const getTouchDistance = useCallback((e: React.TouchEvent): number => {
    if (e.touches.length < 2) return 0;
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const deltaX = touch2.clientX - touch1.clientX;
    const deltaY = touch2.clientY - touch1.clientY;
    
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }, []);

  // Get center point between two touches
  const getTouchCenter = useCallback((e: React.TouchEvent): Point => {
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

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
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
    }
  }, [getMousePos, selectionMode, sourceImageData, polygonSelection, scale, offset, screenToImageCoords, extractSelectionData, drawCanvas]);

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
  }, [isDrawing, dragSelection, isPanning, lastPanPoint, getMousePos, selectionMode]);

  const handleMouseUp = useCallback(() => {
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
  }, [isDrawing, isPanning, selectionMode, dragSelection, extractSelectionDataFromRect]);


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
      onSelectionChange(null);
      drawCanvas();
      previousSelectionMode.current = selectionMode;
    }
  }, [selectionMode, polygonSelection, onSelectionChange, drawCanvas]);




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
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - start selection or panning
      const pos = getTouchPos(e, 0);
      setIsDrawing(true);
      setSelection({ start: pos, end: pos });
    } else if (e.touches.length === 2) {
      // Two finger pinch - start zoom
      const distance = getTouchDistance(e);
      setTouchStartDistance(distance);
      setTouchStartScale(scale);
      setIsDrawing(false); // Cancel selection
    }
  }, [getTouchPos, getTouchDistance, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDrawing && selection) {
      // Single touch move - update selection
      const pos = getTouchPos(e, 0);
      setSelection(prev => prev ? { ...prev, end: pos } : null);
    } else if (e.touches.length === 2 && touchStartDistance) {
      // Two finger pinch - zoom
      const currentDistance = getTouchDistance(e);
      const scaleChange = currentDistance / touchStartDistance;
      const newScale = Math.max(minScale, Math.min(maxScale, touchStartScale * scaleChange));
      
      if (newScale !== scale) {
        const center = getTouchCenter(e);
        const scaleRatio = newScale / scale;
        setOffset((prev: Point) => ({
          x: center.x - (center.x - prev.x) * scaleRatio,
          y: center.y - (center.y - prev.y) * scaleRatio,
        }));
        setScale(newScale);
      }
    }
  }, [isDrawing, selection, touchStartDistance, touchStartScale, scale, minScale, maxScale, getTouchPos, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      extractSelectionData();
    }
    
    setTouchStartDistance(null);
    setTouchStartScale(1);
  }, [isDrawing, extractSelectionData]);

  return (
    <Card className={className}>
      <CardContent>
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Image Canvas</h3>
          <div className="flex items-center space-x-2">
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
            <button
              onClick={clearSelection}
              disabled={!(selection || currentMask || polygonSelection.getIsComplete())}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-white"
              title="Clear selection (ESC)"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="relative bg-gray-100 rounded-lg overflow-hidden"
          style={{ height: 'min(70vh, 900px)', minHeight: '400px' }}
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 ${
              isPanning 
                ? 'cursor-move' 
                : selectionMode === 'polygon' 
                  ? 'cursor-pointer' 
                  : 'cursor-crosshair'
            } touch-none`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => {
              e.preventDefault(); // Prevent context menu
            }}
          />
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          {selectionMode === 'rectangle' && selection ? (
            <p>
              Selection: {Math.abs(selection.end.x - selection.start.x).toFixed(0)} × {Math.abs(selection.end.y - selection.start.y).toFixed(0)} px
            </p>
          ) : selectionMode === 'polygon' && polygonSelection.getVertices().length > 0 ? (
            <p>
              Polygon path: {polygonSelection.getVertices().length} points • {polygonSelection.getIsComplete() ? 'Selection completed - extracting colors' : 'Click near first point or double-click to complete'}
            </p>
          ) : (
            <p>Click and drag to select an area for color extraction</p>
          )}
          <p className="text-xs text-gray-500">
            <span className="hidden sm:inline">
              Controls: Shift + drag to pan • ESC to clear selection
            </span>
            <span className="sm:hidden">
              Touch: Tap and drag to select • Two fingers to zoom and pan
            </span>
          </p>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}