'use client';

import React from 'react';
import type { Dataset } from '@/lib/contracts/types';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, Loader2, Eye, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const STATUS_CONFIG: Record<Dataset['status'], {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  UPLOADING: {
    label: 'Uploading',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: 'border-blue-800 bg-blue-950/60 text-blue-300',
  },
  VALIDATING: {
    label: 'Validating',
    icon: <Clock className="h-3 w-3" />,
    className: 'border-yellow-800 bg-yellow-950/60 text-yellow-300',
  },
  PROCESSING: {
    label: 'Processing',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: 'border-indigo-800 bg-indigo-950/60 text-indigo-300',
  },
  READY: {
    label: 'Ready',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'border-emerald-800 bg-emerald-950/60 text-emerald-300',
  },
  FAILED: {
    label: 'Failed',
    icon: <XCircle className="h-3 w-3" />,
    className: 'border-red-800 bg-red-950/60 text-red-300',
  },
};

interface DatasetTableProps {
  datasets: Dataset[];
  isLoading?: boolean;
  onSelect?: (dataset: Dataset) => void;
  selectedId?: string | null;
}

export function DatasetTable({ datasets, isLoading, onSelect, selectedId }: DatasetTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-slate-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dataset</TableHead>
            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Rows</TableHead>
            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Size</TableHead>
            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Uploaded</TableHead>
            <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datasets.map((dataset) => {
            const statusCfg = STATUS_CONFIG[dataset.status];
            const isSelected = dataset.id === selectedId;

            return (
              <TableRow
                key={dataset.id}
                className={cn(
                  'border-slate-800 transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-slate-800/80'
                    : 'hover:bg-slate-900/60'
                )}
                onClick={() => onSelect?.(dataset)}
              >
                <TableCell className="py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200 truncate max-w-[200px] lg:max-w-none">
                      {dataset.name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{dataset.source_type}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('flex items-center gap-1.5 w-fit text-[11px] font-medium', statusCfg.className)}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </Badge>
                  {dataset.validation_errors.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-400">
                      <AlertCircle className="h-3 w-3" />
                      {dataset.validation_errors.length} warning{dataset.validation_errors.length > 1 ? 's' : ''}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="text-sm font-mono text-slate-300">
                    {dataset.row_count != null ? dataset.row_count.toLocaleString() : '—'}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm font-mono text-slate-300">
                    {formatBytes(dataset.file_size_bytes)}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(dataset.uploaded_at), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onSelect?.(dataset); }}
                    className="h-7 gap-1.5 text-xs text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
