'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { renderColorPalette, type RGBColor, type CubeRenderConfig } from '@palette-tool/cube-renderer';
import { Card, CardContent, Button } from '@/components/ui';

interface CubeVisualizationProps {
  colors: RGBColor[];
  config?: Partial<CubeRenderConfig>;
}

export default function CubeVisualization({ colors, config = {} }: CubeVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const defaultConfig = useMemo(() => ({
    size: 35,
    spacing: 8,
    layout: {
      columns: Math.min(4, colors.length),
    },
    lighting: {
      ambient: 0.3,
      diffuse: 0.7,
      lightDirection: { x: -1, y: -1, z: 1.2 },
    },
    ...config,
  }), [colors.length, config]);

  const renderCubes = useCallback(async () => {
    if (!canvasRef.current || colors.length === 0) return;

    setIsRendering(true);

    try {
      const result = renderColorPalette(colors, defaultConfig, canvasRef.current);
      setRenderTime(result.renderTime);
      setDownloadUrl(result.imageData);
    } catch (error) {
      console.error('Cube rendering failed:', error);
    } finally {
      setIsRendering(false);
    }
  }, [colors, defaultConfig]);

  useEffect(() => {
    renderCubes();
  }, [renderCubes]);

  const handleDownload = () => {
    if (!downloadUrl) return;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'color-palette-cubes.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRegenerate = () => {
    renderCubes();
  };

  if (colors.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <p className="text-gray-600">No colors extracted yet</p>
            <p className="text-sm text-gray-500">
              Upload an image to see the 3D cube visualization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">3D Cube Visualization</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              {renderTime && (
                <span className="text-xs text-gray-500 order-last sm:order-first">
                  Rendered in {renderTime.toFixed(1)}ms
                </span>
              )}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isRendering}
                >
                  {isRendering ? 'Rendering...' : 'Regenerate'}
                </Button>
                {downloadUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    Download PNG
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            {isRendering && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Rendering 3D cubes...</span>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto border border-gray-100 rounded-md shadow-sm bg-white"
                style={{ display: 'block', margin: '0 auto' }}
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Isometric 3D visualization shows color relationships and depth</p>
            <p>• Each cube represents a color with proper lighting and shading</p>
            <p>• Arranged in a grid for easy color comparison during painting</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}