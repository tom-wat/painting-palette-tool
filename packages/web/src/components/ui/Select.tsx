'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  value: string;
  onChange: (_value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select an option',
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full', className)} ref={selectRef}>
      {label && <label className="mb-1.5 block text-sm">{label}</label>}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-1.5 text-left text-sm focus:outline-none focus:ring-1 focus:ring-ring',
          isOpen && 'ring-1 ring-ring'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="max-h-60 overflow-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  'block w-full px-3 py-1.5 text-left text-sm transition-colors',
                  option.value === value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => handleOptionClick(option.value)}
              >
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div
                    className={cn(
                      'text-xs',
                      option.value === value
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    )}
                  >
                    {option.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
