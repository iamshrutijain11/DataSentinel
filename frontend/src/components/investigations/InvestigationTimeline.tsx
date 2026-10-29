'use client';

import React, { useState } from 'react';
import type { InvestigationStep } from '@/lib/contracts/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Brain,
  Clock,
} from 'lucide-react';

const PHASE_COLORS: Record<string, string> = {
  PLANNING: 'border-blue-800 bg-blue-950/50 text-blue-300',
  EVIDENCE_COLLECTION: 'border-indigo-800 bg-indigo-950/50 text-indigo-300',
  HYPOTHESIS_TESTING: 'border-yellow-800 bg-yellow-950/50 text-yellow-300',
  REPORT_GENERATION: 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
};

function StepCard({ step, isLast }: { step: InvestigationStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(true);

  const statusIcon =
    step.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    step.status === 'failed' ? <XCircle className="h-4 w-4 text-red-400" /> :
    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />;

  const phaseColor = PHASE_COLORS[step.phase] ?? 'border-slate-700 bg-slate-800 text-slate-400';

  return (
    <div className="relative flex gap-4">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-800" />
      )}

      {/* Step Number Circle */}
      <div className={cn(
        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold font-mono',
        step.status === 'completed'
          ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
          : step.status === 'failed'
          ? 'border-red-700 bg-red-950 text-red-400'
          : 'border-indigo-700 bg-indigo-950 text-indigo-300'
      )}>
        {step.step_number}
      </div>

      {/* Card Content */}
      <div className="flex-1 mb-6">
        <div className={cn(
          'rounded-xl border overflow-hidden',
          step.status === 'running' ? 'border-indigo-800/60' : 'border-slate-800'
        )}>
          {/* Header */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-start justify-between p-4 hover:bg-slate-800/30 transition-colors text-left"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {statusIcon}
                <span className="text-sm font-semibold text-slate-200 font-mono">
                  {step.tool_name}
                </span>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-mono', phaseColor)}
                >
                  {step.phase.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{step.input_query}</p>
            </div>
            <div className="flex items-center gap-3 ml-3 shrink-0">
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <Clock className="h-3 w-3" />
                {step.execution_time_ms}ms
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>

          {expanded && (
            <div className="border-t border-slate-800 bg-slate-900/40">
              {/* Output Summary */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 mb-2">
                    <Terminal className="h-3 w-3" />
                    Tool Output
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{step.output_summary}</p>
                </div>

                <Separator className="bg-slate-800" />

                {/* AI Reasoning */}
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-500 mb-2">
                    <Brain className="h-3 w-3 text-indigo-400" />
                    Agent Reasoning
                  </div>
                  <div className="rounded-lg border border-indigo-900/40 bg-indigo-950/20 px-4 py-3">
                    <p className="text-xs text-indigo-200 leading-relaxed italic">
                      {step.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface InvestigationTimelineProps {
  steps: InvestigationStep[];
}

export function InvestigationTimeline({ steps }: InvestigationTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Agent is initializing…</p>
        <p className="text-xs text-slate-500 mt-1">Steps will appear as the investigation progresses</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="p-1">
        {steps.map((step, idx) => (
          <StepCard
            key={step.step_number}
            step={step}
            isLast={idx === steps.length - 1}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
