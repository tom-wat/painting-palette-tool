'use client';

import React from 'react';
import { Button } from '../ui';
import { LabeledSlider, SegmentedControl } from '../controls';
import { type AnnotationColorSpace } from '@/lib/annotation-render';

interface AnnotationControlsProps {
  lineOpacity: number;
  onLineOpacityChange: (_value: number) => void;
  fontSize: number;
  onFontSizeChange: (_size: number) => void;
  onClearAnnotations: () => void;
  onExportImage: () => void;
  onExportOverlay: () => void;
  hasAnnotations: boolean;
  annotationTheme: 'light' | 'dark';
  onAnnotationThemeChange: (_theme: 'light' | 'dark') => void;
  lineColor: string;
  onLineColorChange: (_color: string) => void;
  colorSpace: AnnotationColorSpace;
  onColorSpaceChange: (_colorSpace: AnnotationColorSpace) => void;
}

const colorSpaceOptions = [
  { value: 'hscl' as AnnotationColorSpace, label: 'HScL' },
  { value: 'hsl' as AnnotationColorSpace, label: 'HSL' },
];

const themeOptions = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
];

/** The two line colors the annotation renderer supports. */
const lineColorOptions = [
  { value: '#ffffff', label: 'White' },
  { value: '#000000', label: 'Black' },
];

/** One labelled control row in the annotation panel. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="block text-sm">{label}</span>
      {children}
    </div>
  );
}

export default function AnnotationControls({
  lineOpacity,
  onLineOpacityChange,
  fontSize,
  onFontSizeChange,
  onClearAnnotations,
  onExportImage,
  onExportOverlay,
  hasAnnotations,
  annotationTheme,
  onAnnotationThemeChange,
  lineColor,
  onLineColorChange,
  colorSpace,
  onColorSpaceChange,
}: AnnotationControlsProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Annotations</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Color Space">
          <SegmentedControl
            ariaLabel="Color space"
            value={colorSpace}
            onChange={onColorSpaceChange}
            options={colorSpaceOptions}
          />
        </Field>

        <Field label="Label Theme">
          <SegmentedControl
            ariaLabel="Label theme"
            value={annotationTheme}
            onChange={onAnnotationThemeChange}
            options={themeOptions}
          />
        </Field>

        <Field label="Line Color">
          <SegmentedControl
            ariaLabel="Line color"
            value={lineColor}
            onChange={onLineColorChange}
            options={lineColorOptions}
          />
        </Field>

        <LabeledSlider
          label="Line Opacity"
          value={Math.round(lineOpacity * 100)}
          onChange={(v) => onLineOpacityChange(v / 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
        />

        <LabeledSlider
          label="Font Size"
          value={fontSize}
          onChange={onFontSizeChange}
          min={12}
          max={36}
          unit="px"
        />

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={!hasAnnotations}
            onClick={onExportImage}
          >
            Export PNG
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={!hasAnnotations}
            onClick={onExportOverlay}
          >
            Export PNG (overlay)
          </Button>
        </div>

        <div>
          <Button
            variant="destructive"
            className="w-full"
            disabled={!hasAnnotations}
            onClick={onClearAnnotations}
          >
            Clear All Annotations
          </Button>
        </div>
      </div>
    </div>
  );
}
