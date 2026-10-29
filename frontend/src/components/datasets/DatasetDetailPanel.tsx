'use client';

import React from 'react';
import type { Dataset } from '@/lib/contracts/types';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Map,
  AlertCircle,
  CheckCircle2,
  Clock,
  Hash,
  HardDrive,
  Calendar,
} from 'lucide-react';

interface DatasetDetailPanelProps {
  dataset: Dataset;
}

export function DatasetDetailPanel({ dataset }: DatasetDetailPanelProps) {
  const fieldEntries = Object.entries(dataset.field_mappings);

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="pb-3 border-b border-slate-800">
        <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Map className="h-4 w-4 text-indigo-400" />
          Dataset Details
        </CardTitle>
        <p className="text-xs text-slate-400 font-mono mt-1 truncate">{dataset.id}</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-5">

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-800/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400 mb-1">
              <Hash className="h-3 w-3" />
              Rows
            </div>
            <p className="text-base font-bold font-mono text-slate-100">
              {dataset.row_count != null ? dataset.row_count.toLocaleString() : 'Pending'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400 mb-1">
              <HardDrive className="h-3 w-3" />
              Size
            </div>
            <p className="text-base font-bold font-mono text-slate-100">
              {(dataset.file_size_bytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <div className="col-span-2 rounded-lg bg-slate-800/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400 mb-1">
              <Calendar className="h-3 w-3" />
              Timestamps
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500">Uploaded</p>
                <p className="text-xs font-mono text-slate-300">
                  {formatDistanceToNow(new Date(dataset.uploaded_at), { addSuffix: true })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Processed</p>
                <p className="text-xs font-mono text-slate-300">
                  {dataset.processed_at
                    ? formatDistanceToNow(new Date(dataset.processed_at), { addSuffix: true })
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Validation Errors */}
        {dataset.validation_errors.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-300">
                {dataset.validation_errors.length} Validation Warning{dataset.validation_errors.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {dataset.validation_errors.map((err, i) => (
                <div key={i} className="rounded-md border border-orange-900/60 bg-orange-950/30 px-3 py-2 text-xs text-orange-300">
                  {err}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>No validation errors detected</span>
          </div>
        )}

        <Separator className="bg-slate-800" />

        {/* Field Mappings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Map className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Normalized Field Mappings</span>
            <Badge variant="outline" className="ml-auto text-[10px] font-mono border-slate-700 text-slate-400">
              {fieldEntries.length} fields
            </Badge>
          </div>

          {fieldEntries.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3">
              <Clock className="h-3.5 w-3.5" />
              Field mappings will appear once validation completes.
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5">
                {fieldEntries.map(([raw, normalized]) => (
                  <div
                    key={raw}
                    className="flex items-center gap-2 rounded-md bg-slate-800/60 px-3 py-2"
                  >
                    <span className="text-xs font-mono text-slate-400 min-w-0 truncate flex-1">{raw}</span>
                    <span className="text-slate-600 text-xs">→</span>
                    <span className="text-xs font-mono text-cyan-400 min-w-0 truncate flex-1 text-right">{normalized}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
