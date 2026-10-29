import React, { type ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40 p-12 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/80 text-cyan-400 mb-4 border border-slate-700/60">
        {icon || <ShieldAlert className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="max-w-md text-sm text-slate-400 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
