'use client';

import { useCallback } from 'react';
import { SegmentedControl } from '../controls';

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

const selectionModes = [
  {
    value: 'point' as SelectionMode,
    label: 'Point',
    description: 'Click to select individual pixels and add colors to palette',
  },
  {
    value: 'rectangle' as SelectionMode,
    label: 'Rect',
    description: 'Click and drag to select rectangular area',
  },
  {
    value: 'polygon' as SelectionMode,
    label: 'Poly',
    description: 'Click points to create polygon selection',
  },
];

const annotationModes = [
  { value: 'pick' as AnnotationMode, label: 'Pick' },
  { value: 'annotate' as AnnotationMode, label: 'Annotate' },
];

/** Hint copy for the currently active mode. */
function ModeHint({
  mode,
  annotationMode,
}: {
  mode: SelectionMode;
  annotationMode: AnnotationMode;
}) {
  const [title, detail] =
    mode === 'rectangle'
      ? ['Click and drag to select rectangular areas', 'Shift+drag to pan']
      : mode === 'polygon'
        ? [
            'Click to place points and create polygon areas',
            'Double-click or click first point to complete',
          ]
        : annotationMode === 'pick'
          ? [
              'Click anywhere on the image',
              'Each click adds the pixel color directly to your palette',
            ]
          : [
              'Click and drag to annotate',
              'Color info will be drawn at the drag destination',
            ];

  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/**
 * Selection-mode controls for the left panel. Rendered as bare panel content —
 * the surrounding CollapsibleSection supplies the title and the border.
 */
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

  return (
    <div className={`space-y-3 ${className}`}>
      <SegmentedControl
        ariaLabel="Selection mode"
        value={config.mode}
        onChange={handleModeChange}
        options={selectionModes}
      />

      {config.mode === 'point' && onAnnotationModeChange && (
        <SegmentedControl
          ariaLabel="Point action"
          value={annotationMode}
          onChange={onAnnotationModeChange}
          options={annotationModes}
          size="sm"
        />
      )}

      <ModeHint mode={config.mode} annotationMode={annotationMode} />
    </div>
  );
}
