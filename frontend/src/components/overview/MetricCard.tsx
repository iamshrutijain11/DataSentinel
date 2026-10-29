import React, { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon: ReactNode;
  description?: string;
  badge?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  trend,
  icon,
  description,
  badge,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('bg-slate-900/90 border-slate-800 text-slate-100 shadow-md backdrop-blur-sm', className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800/80 text-cyan-400 border border-slate-700/50">
            {icon}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {badge && (
            <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyan-400 border border-cyan-800/50">
              {badge}
            </span>
          )}
        </div>

        {(trend || description) && (
          <div className="mt-3 flex items-center justify-between text-xs">
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-0.5 font-medium font-mono text-[11px]',
                  trend.isPositive ? 'text-red-400' : 'text-emerald-400'
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span>{trend.value}</span>
                {trend.label && (
                  <span className="text-slate-400 ml-1 font-sans">{trend.label}</span>
                )}
              </div>
            )}
            {description && (
              <span className="text-slate-400 text-[11px] truncate">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
