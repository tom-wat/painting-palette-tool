import React from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-card text-card-foreground', className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={cn('border-b border-border px-4 py-3', className)}>{children}</div>;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return <h3 className={cn('text-sm font-semibold', className)}>{children}</h3>;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  // If className is provided, use it completely; otherwise use default padding
  const contentClasses = className ? className : 'p-4';
  return <div className={contentClasses}>{children}</div>;
}
