import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load telemetry data',
  message = 'An unexpected network error occurred while querying the backend service.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-red-900/50 bg-red-950/20 p-8 text-center',
        className
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950 text-red-400 mb-4 border border-red-800">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="max-w-md text-sm text-red-300/80 mb-6">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-red-800 bg-red-950/40 text-red-300 hover:bg-red-900/40 hover:text-red-200 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      )}
    </div>
  );
}
