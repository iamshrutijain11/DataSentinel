import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({
  label = 'Loading cybersecurity telemetry...',
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 p-8 text-slate-400', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('animate-spin text-cyan-400', sizeMap[size])} />
      {label && <p className="text-xs font-medium tracking-wider uppercase text-slate-400">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}
