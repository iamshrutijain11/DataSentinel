'use client';

import React, { useState } from 'react';
import type { Alert, Severity, AlertStatus } from '@/lib/contracts/types';
import { formatDistanceToNow } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Network,
  FileText,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';

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

function RiskGauge({ score }: { score: number }) {
  const color =
    score >= 90 ? '#ef4444' :
    score >= 70 ? '#f97316' :
    score >= 50 ? '#eab308' : '#3b82f6';

  const r = 36;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - (score / 100) * arc;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="80" viewBox="0 0 100 80" className="overflow-visible">
        <path
          d="M 14 70 A 36 36 0 1 1 86 70"
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 14 70 A 36 36 0 1 1 86 70"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc}`}
          strokeDashoffset={`${offset}`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text
          x="50"
          y="60"
          textAnchor="middle"
          className="font-mono font-bold"
          fill={color}
          fontSize="20"
        >
          {score}
        </text>
      </svg>
      <span className="text-[10px] font-mono text-slate-400 -mt-1">RISK SCORE</span>
    </div>
  );
}

interface AlertDetailDrawerProps {
  alert: Alert | null;
  open: boolean;
  onClose: () => void;
}

export function AlertDetailDrawer({ alert, open, onClose }: AlertDetailDrawerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());

  const { mutate: launchInvestigation, isPending: isLaunching } = useMutation({
    mutationFn: (alertId: string) =>
      api.createInvestigation({ alert_id: alertId, model_id: 'nvidia/llama-3.1-nemotron-70b-instruct' }),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
      toast.success('Investigation launched', {
        description: `${inv.id} — Nemotron-70B analysis queued`,
        action: {
          label: 'View',
          onClick: () => router.push(`/investigations/${inv.id}`),
        },
      });
      router.push(`/investigations/${inv.id}`);
    },
    onError: (err) => {
      toast.error('Failed to launch investigation', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!alert) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-slate-950 border-slate-800 p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              {alert.id}
            </SheetTitle>
            <Badge
              variant="outline"
              className={cn('text-xs font-semibold', SEVERITY_STYLES[alert.severity])}
            >
              {alert.severity}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">{alert.detection_type}</p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Risk + Status Row */}
            <div className="flex items-center gap-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <RiskGauge score={alert.risk_score} />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500 mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', STATUS_STYLES[alert.status])}
                  >
                    {alert.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500 mb-1">Detected</p>
                  <p className="text-xs text-slate-300">
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-slate-500 mb-1">Alert Count</p>
                  <p className="text-xs font-mono text-slate-300">{alert.alert_count.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Description
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{alert.description}</p>
            </div>

            <Separator className="bg-slate-800" />

            {/* Network Info */}
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 mb-3 flex items-center gap-1.5">
                <Network className="h-3 w-3" />
                Network Details
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Source IP', value: alert.source_ip },
                  { label: 'Destination IP', value: alert.destination_ip },
                  { label: 'Source Port', value: String(alert.source_port) },
                  { label: 'Destination Port', value: String(alert.destination_port) },
                  { label: 'Protocol', value: alert.protocol },
                  { label: 'Dataset', value: alert.dataset_id },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
                    <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                    <p className="text-xs font-mono text-slate-200 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Evidence */}
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-500 mb-3 flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3" />
                Evidence ({alert.evidence.length})
              </p>
              <div className="space-y-2">
                {alert.evidence.map((ev) => {
                  const isExpanded = expandedEvidence.has(ev.id);
                  return (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleEvidence(ev.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-200">{ev.type}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                          : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        }
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2 border-t border-slate-800">
                          <p className="text-xs text-slate-300 pt-2">{ev.detail}</p>
                          {ev.raw_payload && (
                            <div className="rounded-md bg-slate-950 border border-slate-800 px-3 py-2">
                              <p className="text-[10px] font-mono text-slate-500 mb-1">Raw Payload</p>
                              <pre className="text-[11px] font-mono text-cyan-300 whitespace-pre-wrap break-all">
                                {ev.raw_payload}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
          <Button
            onClick={() => launchInvestigation(alert.id)}
            disabled={isLaunching}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold h-10 gap-2"
          >
            <Zap className="h-4 w-4" />
            {isLaunching ? 'Launching Nemotron Investigation…' : 'Launch AI Investigation'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
