import React from 'react';
import { cn } from '@/lib/cn';

interface SliderProps {
  value: number;
  onChange: (_value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

/**
 * Bare slider. Prefer `controls/LabeledSlider` for settings-panel rows — this
 * stays for the places that need a slider without the standard row layout.
 */
export default function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  className = '',
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-2 flex items-baseline justify-between">
          <label className="text-sm">{label}</label>
          <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
        </div>
      )}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--slider-fill': `${percentage}%` } as React.CSSProperties}
        className="range-track h-1.5 w-full cursor-pointer appearance-none rounded-full"
      />
    </div>
  );
}
