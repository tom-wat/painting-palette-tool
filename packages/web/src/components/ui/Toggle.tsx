import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function Toggle({
  checked,
  onChange,
  label,
  className = '',
}: ToggleProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors
          ${checked ? 'bg-gray-800' : 'bg-gray-300'}
        `}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`
            inline-block h-3 w-3 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-1'}
          `}
        />
      </div>
      {label && (
        <label
          className="ml-3 text-sm font-medium text-gray-800 cursor-pointer"
          onClick={() => onChange(!checked)}
        >
          {label}
        </label>
      )}
    </div>
  );
}