import React from 'react';
import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (_checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function Toggle({ checked, onChange, label, className = '' }: ToggleProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'inline-block h-3 w-3 transform rounded-full bg-background transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
      {label && (
        <label className="ml-3 cursor-pointer text-sm" onClick={() => onChange(!checked)}>
          {label}
        </label>
      )}
    </div>
  );
}
