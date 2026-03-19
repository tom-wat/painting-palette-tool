import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';

export type SelectionMode = 'rectangle' | 'polygon' | 'point';
export type AnnotationMode = 'pick' | 'annotate';

export interface AdvancedSelectionConfig {
  mode: SelectionMode;
}

interface AdvancedSelectionToolsProps {
  config: AdvancedSelectionConfig;
  onConfigChange: (_config: AdvancedSelectionConfig) => void;
  onModeChange: (_mode: SelectionMode) => void;
  onClearSelection?: () => void;
  className?: string;
  annotationMode?: AnnotationMode;
  onAnnotationModeChange?: (_mode: AnnotationMode) => void;
}

export default function AdvancedSelectionTools({
  config,
  onConfigChange,
  onModeChange,
  onClearSelection: _onClearSelection,
  className = '',
  annotationMode = 'pick',
  onAnnotationModeChange,
}: AdvancedSelectionToolsProps) {
  const handleModeChange = useCallback(
    (mode: SelectionMode) => {
      onModeChange(mode);
      onConfigChange({ ...config, mode });
    },
    [config, onConfigChange, onModeChange]
  );

  const pointMode = {
    id: 'point' as SelectionMode,
    name: 'Point',
    description: 'Click to select individual pixels and add colors to palette',
  };

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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Selection Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Selection Mode
            </label>
            {/* Point selection - single row */}
            <div className="mb-3">
              <button
                onClick={() => handleModeChange(pointMode.id)}
                className={`w-full p-3 border rounded-lg text-center transition-colors ${
                  config.mode === pointMode.id
                    ? 'border-gray-800 bg-gray-50'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
                title={pointMode.description}
              >
                <span className="text-sm font-medium">{pointMode.name}</span>
              </button>
            </div>

            {/* Area selection modes - grid row */}
            <div className="grid grid-cols-2 gap-2">
              {selectionModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    config.mode === mode.id
                      ? 'border-gray-800 bg-gray-50'
                      : 'border-gray-100 hover:border-gray-300'
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
              <p className="text-xs text-gray-500 mt-1">Shift+drag to pan</p>
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

          {config.mode === 'point' && (
            <div className="space-y-3">
              {/* Pick / Annotate sub-toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => onAnnotationModeChange?.('pick')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    annotationMode === 'pick'
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Pick
                </button>
                <button
                  onClick={() => onAnnotationModeChange?.('annotate')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    annotationMode === 'annotate'
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Annotate
                </button>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                {annotationMode === 'pick' ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Click anywhere on the image
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Each click adds the pixel color directly to your palette
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Click and drag to annotate
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Color info will be drawn at the drag destination
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
