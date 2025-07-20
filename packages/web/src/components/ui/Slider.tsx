import React from 'react';

interface SliderProps {
  value: number;
  onChange: (_value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

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
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-black">{label}</label>
          <span className="text-sm text-gray-600">{value}</span>
        </div>
      )}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #000 0%, #000 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
          }}
        />
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
