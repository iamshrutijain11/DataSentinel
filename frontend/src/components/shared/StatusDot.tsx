import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'healthy' | 'degraded' | 'unhealthy' | 'neutral' | 'active';

interface StatusDotProps {
  status: StatusVariant | string;
  className?: string;
  pulse?: boolean;
}

export function StatusDot({ status, className, pulse = true }: StatusDotProps) {
  let color = 'bg-slate-500';
  let ringColor = 'bg-slate-400';

  switch (status.toLowerCase()) {
    case 'healthy':
    case 'ready':
    case 'completed':
    case 'up':
    case 'resolved':
      color = 'bg-emerald-400';
      ringColor = 'bg-emerald-400';
      break;
    case 'degraded':
    case 'processing':
    case 'validating':
    case 'investigating':
    case 'running':
    case 'active':
      color = 'bg-amber-400';
      ringColor = 'bg-amber-400';
      break;
    case 'unhealthy':
    case 'failed':
    case 'critical':
    case 'down':
      color = 'bg-red-500';
      ringColor = 'bg-red-400';
      break;
    case 'open':
      color = 'bg-cyan-400';
      ringColor = 'bg-cyan-400';
      break;
    case 'uploading':
    case 'queued':
      color = 'bg-blue-400';
      ringColor = 'bg-blue-400';
      break;
    default:
      color = 'bg-slate-400';
      ringColor = 'bg-slate-300';
  }

  return (
    <span className={cn('relative flex h-2 w-2 shrink-0 items-center justify-center', className)}>
      {pulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            ringColor
          )}
        />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
    </span>
  );
}
