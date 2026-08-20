import React from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'icon-sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline:
      'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
    ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    destructive:
      'border border-border bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    'icon-sm': 'h-7 w-7 p-0 [&_svg]:h-4 [&_svg]:w-4',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
