'use client';

import React from 'react';

interface ColorRowProps {
  label: string;
  /** Hex color like '#ff8800'. */
  value: string;
  onChange: (_hex: string) => void;
  disabled?: boolean;
}

/** Settings-panel row for picking a color: label, swatch picker, hex field. */
export default function ColorRow({ label, value, onChange, disabled }: ColorRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          aria-label={`${label} color`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-7 w-9 cursor-pointer rounded-sm border border-border bg-background p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const hex = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex);
          }}
          disabled={disabled}
          aria-label={`${label} hex value`}
          className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}
