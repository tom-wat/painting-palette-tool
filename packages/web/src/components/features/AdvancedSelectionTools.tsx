import React, { useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';

export type SelectionMode = 'rectangle' | 'polygon';

export interface AdvancedSelectionConfig {
  mode: SelectionMode;
}

interface AdvancedSelectionToolsProps {
  config: AdvancedSelectionConfig;
  onConfigChange: (_config: AdvancedSelectionConfig) => void;
  onModeChange: (_mode: SelectionMode) => void;
  onClearSelection?: () => void;
  className?: string;
}

export default function AdvancedSelectionTools({
  config,
  onConfigChange,
  onModeChange,
  onClearSelection: _onClearSelection,
  className = '',
}: AdvancedSelectionToolsProps) {

  const handleModeChange = useCallback((mode: SelectionMode) => {
    onModeChange(mode);
    onConfigChange({ ...config, mode });
  }, [config, onConfigChange, onModeChange]);


  const selectionModes = [
    {
      id: 'rectangle' as SelectionMode,
      name: 'Rectangle',
      description: 'Click and drag to select rectangular area',
    },
    {
      id: 'polygon' as SelectionMode,
      name: 'Polygon',
      description: 'Click points to create polygon selection',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Selection Tools</CardTitle>
        <p className="text-gray-600 text-sm">
          Choose selection mode for more precise color extraction
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selection Mode */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Selection Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {selectionModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    config.mode === mode.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={mode.description}
                >
                  <span className="text-sm font-medium">{mode.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific settings */}
          {config.mode === 'rectangle' && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Click and drag to select rectangular areas
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Shift+drag to pan
              </p>
            </div>
          )}

          {config.mode === 'polygon' && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Click to place points and create polygon areas
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Double-click or click first point to complete
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}