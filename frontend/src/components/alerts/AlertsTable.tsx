'use client';

import React from 'react';
import type { Alert, Severity, AlertStatus } from '@/lib/contracts/types';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'border-red-800 bg-red-950/60 text-red-300',
  HIGH: 'border-orange-800 bg-orange-950/60 text-orange-300',
  MEDIUM: 'border-yellow-800 bg-yellow-950/60 text-yellow-300',
  LOW: 'border-blue-800 bg-blue-950/60 text-blue-300',
  INFO: 'border-slate-700 bg-slate-800 text-slate-400',
};

const STATUS_STYLES: Record<AlertStatus, string> = {
  OPEN: 'border-red-900/60 bg-red-950/30 text-red-400',
  INVESTIGATING: 'border-indigo-800 bg-indigo-950/50 text-indigo-300',
  RESOLVED: 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
  FALSE_POSITIVE: 'border-slate-700 bg-slate-800 text-slate-500',
};

function RiskBar({ score }: { score: number }) {
  const color =
    score >= 90 ? 'bg-red-500' :
    score >= 70 ? 'bg-orange-500' :
    score >= 50 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-300 tabular-nums">{score}</span>
    </div>
  );
}

interface AlertsTableProps {
  alerts: Alert[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onAlertClick: (alert: Alert) => void;
  selectedId?: string | null;
}

export function AlertsTable({
  alerts,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  onPageChange,
  onAlertClick,
  selectedId,
}: AlertsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full bg-slate-800/60 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent bg-slate-900/60">
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-28">
                <button className="flex items-center gap-1 hover:text-slate-200">
                  ID <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Severity</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Detection Type</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Source → Destination</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Risk Score</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-slate-500">
                  No alerts match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow
                  key={alert.id}
                  onClick={() => onAlertClick(alert)}
                  className={cn(
                    'border-slate-800 cursor-pointer transition-colors',
                    selectedId === alert.id
                      ? 'bg-slate-800/80 border-l-2 border-l-cyan-500'
                      : 'hover:bg-slate-900/60'
                  )}
                >
                  <TableCell className="font-mono text-xs text-slate-300 py-3">
                    {alert.id}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[11px] font-semibold', SEVERITY_STYLES[alert.severity])}
                    >
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-slate-300">{alert.detection_type}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="font-mono text-[11px]">
                      <span className="text-slate-300">{alert.source_ip}</span>
                      <span className="text-slate-600 mx-1">→</span>
                      <span className="text-slate-400">{alert.destination_ip}</span>
                      <span className="text-slate-600 text-[10px] ml-1">:{alert.destination_port}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <RiskBar score={alert.risk_score} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', STATUS_STYLES[alert.status])}
                    >
                      {alert.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-slate-500">
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-500">
          Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of{' '}
          <span className="font-mono text-slate-300">{total.toLocaleString()}</span> alerts
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-7 w-7 p-0 border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
