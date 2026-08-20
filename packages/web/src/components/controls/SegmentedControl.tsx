'use client';

import React from 'react';
import { cn } from '@/lib/cn';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Tooltip / accessible description of what the segment does. */
  description?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (_value: T) => void;
  options: SegmentedControlOption<T>[];
  /** Names the group for assistive tech. */
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Mutually exclusive mode switch rendered as one joined bar. Used for the
 * selection mode, the pick/annotate switch and the canvas/saved view switch.
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex overflow-hidden rounded-md border border-border',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.description}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
