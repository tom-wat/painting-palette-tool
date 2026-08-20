'use client';

import React from 'react';

interface LabeledSliderProps {
  label: string;
  value: number;
  onChange: (_value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Shown after the value, e.g. '%' or 'px'. */
  unit?: string;
  disabled?: boolean;
  /** Read out to assistive tech when the visible label is not self-contained. */
  ariaLabel?: string;
}

/** Standard settings-panel row: label left, value right, slider below. */
export default function LabeledSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  disabled,
  ariaLabel,
}: LabeledSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        aria-label={ariaLabel ?? label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        className="range-track h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
