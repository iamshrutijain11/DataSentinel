'use client';

import React from 'react';
import type { InvestigationStatus } from '@/lib/contracts/types';
import { cn } from '@/lib/utils';
import {
  Clock,
  Cpu,
  Search,
  FlaskConical,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

const LIFECYCLE: {
  status: InvestigationStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    status: 'QUEUED',
    label: 'Queued',
    description: 'Waiting for agent capacity',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  {
    status: 'PLANNING',
    label: 'Planning',
    description: 'Formulating threat hypotheses',
    icon: <Cpu className="h-3.5 w-3.5" />,
  },
  {
    status: 'EVIDENCE_COLLECTION',
    label: 'Evidence',
    description: 'Querying network & log stores',
    icon: <Search className="h-3.5 w-3.5" />,
  },
  {
    status: 'HYPOTHESIS_TESTING',
    label: 'Testing',
    description: 'Validating attack hypotheses',
    icon: <FlaskConical className="h-3.5 w-3.5" />,
  },
  {
    status: 'REPORT_GENERATION',
    label: 'Report',
    description: 'Synthesizing MITRE findings',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    description: 'Investigation concluded',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
];

const TERMINAL_STATUSES: InvestigationStatus[] = ['COMPLETED', 'FAILED'];

function getPhaseIndex(status: InvestigationStatus): number {
  if (status === 'FAILED') return -1;
  return LIFECYCLE.findIndex((l) => l.status === status);
}

interface JobStatusBannerProps {
  status: InvestigationStatus;
  errorMessage?: string | null;
}

export function JobStatusBanner({ status, errorMessage }: JobStatusBannerProps) {
  const currentIdx = getPhaseIndex(status);
  const isFailed = status === 'FAILED';
  const isCompleted = status === 'COMPLETED';
  const isActive = !TERMINAL_STATUSES.includes(status);

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-4',
      isFailed
        ? 'border-red-800 bg-red-950/20'
        : isCompleted
        ? 'border-emerald-800 bg-emerald-950/20'
        : 'border-indigo-800 bg-indigo-950/20'
    )}>
      {/* Status Header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border',
          isFailed
            ? 'border-red-700 bg-red-900/60 text-red-400'
            : isCompleted
            ? 'border-emerald-700 bg-emerald-900/60 text-emerald-400'
            : 'border-indigo-700 bg-indigo-900/60 text-indigo-300'
        )}>
          {isFailed ? (
            <XCircle className="h-4 w-4" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>
        <div>
          <p className={cn(
            'text-sm font-semibold',
            isFailed ? 'text-red-300' : isCompleted ? 'text-emerald-300' : 'text-indigo-200'
          )}>
            {isFailed ? 'Investigation Failed' : isCompleted ? 'Investigation Complete' : `Running: ${status.replace('_', ' ')}`}
          </p>
          {isFailed && errorMessage && (
            <p className="text-xs text-red-400 mt-0.5">{errorMessage}</p>
          )}
          {isActive && (
            <p className="text-xs text-slate-400 mt-0.5">
              Nemotron-70B agent loop active — polling for updates
            </p>
          )}
        </div>
      </div>

      {/* Phase Progress */}
      {!isFailed && (
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-4 left-4 right-4 h-px bg-slate-800" />

          <div className="relative flex items-start justify-between">
            {LIFECYCLE.map((phase, idx) => {
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isPending = idx > currentIdx;

              return (
                <div key={phase.status} className="flex flex-col items-center gap-1.5" style={{ flex: '1' }}>
                  <div className={cn(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500',
                    isDone
                      ? 'border-emerald-600 bg-emerald-900 text-emerald-400'
                      : isCurrent
                      ? 'border-indigo-500 bg-indigo-900 text-indigo-300 ring-2 ring-indigo-500/30'
                      : 'border-slate-700 bg-slate-900 text-slate-600'
                  )}>
                    {isCurrent && isActive ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-[10px]">{phase.icon}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      'text-[10px] font-semibold',
                      isDone ? 'text-emerald-400' : isCurrent ? 'text-indigo-300' : 'text-slate-600'
                    )}>
                      {phase.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
