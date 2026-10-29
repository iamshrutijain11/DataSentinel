import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { Severity } from '@/lib/contracts/types';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
  showIcon?: boolean;
}

const severityConfig: Record<
  Severity,
  { label: string; className: string; dotColor: string }
> = {
  CRITICAL: {
    label: 'CRITICAL',
    className: 'text-red-400 bg-red-950/70 border-red-800 hover:bg-red-900/60',
    dotColor: 'bg-red-500',
  },
  HIGH: {
    label: 'HIGH',
    className: 'text-orange-400 bg-orange-950/70 border-orange-800 hover:bg-orange-900/60',
    dotColor: 'bg-orange-500',
  },
  MEDIUM: {
    label: 'MEDIUM',
    className: 'text-yellow-400 bg-yellow-950/70 border-yellow-800 hover:bg-yellow-900/60',
    dotColor: 'bg-yellow-500',
  },
  LOW: {
    label: 'LOW',
    className: 'text-blue-400 bg-blue-950/70 border-blue-800 hover:bg-blue-900/60',
    dotColor: 'bg-blue-400',
  },
  INFO: {
    label: 'INFO',
    className: 'text-slate-400 bg-slate-800/80 border-slate-700 hover:bg-slate-700/80',
    dotColor: 'bg-slate-400',
  },
};

export function SeverityBadge({ severity, className, showIcon = true }: SeverityBadgeProps) {
  const config = severityConfig[severity] || severityConfig.INFO;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono font-semibold text-[11px] tracking-wider px-2 py-0.5 border flex items-center gap-1.5 w-fit uppercase',
        config.className,
        className
      )}
    >
      {showIcon && (
        <span
          className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', config.dotColor)}
          aria-hidden="true"
        />
      )}
      {config.label}
    </Badge>
  );
}
