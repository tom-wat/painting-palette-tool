import React from 'react';

export interface TooltipProps {
  x: number;
  y: number;
  color: {
    r: number;
    g: number;
    b: number;
  };
  visible: boolean;
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number, s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export default function Tooltip({ x, y, color, visible }: TooltipProps) {
  if (!visible) return null;

  const { r, g, b } = color;
  const { h, s, l } = rgbToHsl(r, g, b);

  return (
    <div
      className="absolute pointer-events-none z-50 bg-black text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700"
      style={{
        left: x + 10,
        top: y - 10,
        transform: x > window.innerWidth - 120 ? 'translateX(-100%)' : 'none',
      }}
    >
      <div className="flex items-center space-x-2">
        <div
          className="w-4 h-4 border border-gray-400 rounded-sm"
          style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
        />
        <div>
          <div className="font-mono">H: {h}°</div>
          <div className="text-gray-300 font-mono">
            S: {s}% L: {l}%
          </div>
        </div>
      </div>
    </div>
  );
}