import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export default function Input({
  label,
  error,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-black mb-1">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white
          focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-black mb-1">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white
          focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
