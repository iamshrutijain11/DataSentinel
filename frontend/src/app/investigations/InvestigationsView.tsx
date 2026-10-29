'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { Investigation } from '@/lib/contracts/types';
import { JobStatusBanner } from '@/components/investigations/JobStatusBanner';
import { InvestigationTimeline } from '@/components/investigations/InvestigationTimeline';
import { FindingsPanel } from '@/components/investigations/FindingsPanel';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  SearchCode,
  ShieldAlert,
  Clock,
  Cpu,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED'];

const STATUS_STYLES: Record<Investigation['status'], string> = {
  QUEUED: 'border-slate-700 text-slate-400',
  PLANNING: 'border-blue-800 text-blue-300',
  EVIDENCE_COLLECTION: 'border-indigo-800 text-indigo-300',
  HYPOTHESIS_TESTING: 'border-yellow-800 text-yellow-300',
  REPORT_GENERATION: 'border-emerald-800 text-emerald-300',
  COMPLETED: 'border-emerald-700 text-emerald-400',
  FAILED: 'border-red-800 text-red-400',
};

// Hook that polls until terminal state
function useInvestigation(id: string | null) {
  return useQuery({
    queryKey: ['investigation', id],
    queryFn: () => api.getInvestigation(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL_STATUSES.includes(status)) return false;
      return 3000;
    },
  });
}

function InvestigationListItem({
  investigation,
  isSelected,
  onClick,
}: {
  investigation: { id: string; alert_id: string; status: Investigation['status']; created_at: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
        isSelected
          ? 'border-cyan-800 bg-cyan-950/30 text-cyan-300'
          : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 text-slate-300'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono font-semibold">{investigation.id}</span>
        <ChevronRight className="h-3 w-3 text-slate-500" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{investigation.alert_id}</span>
        <Badge
          variant="outline"
          className={cn('text-[9px] font-mono h-4 px-1.5', STATUS_STYLES[investigation.status])}
        >
          {investigation.status.replace('_', ' ')}
        </Badge>
      </div>
      <p className="text-[10px] text-slate-600 mt-1">
        {formatDistanceToNow(new Date(investigation.created_at), { addSuffix: true })}
      </p>
    </button>
  );
}

export default function InvestigationsView({ initialId }: { initialId?: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(initialId || null);

  // List from overview metrics (available investigations)
  const { data: overviewData } = useQuery({
    queryKey: ['overview'],
    queryFn: api.getOverviewMetrics,
  });

  const recentInvestigations = overviewData?.recent_investigations ?? [];

  // Auto-select first investigation if none specified
  React.useEffect(() => {
    if (!selectedId && recentInvestigations.length > 0) {
      setSelectedId(recentInvestigations[0].id);
    }
  }, [selectedId, recentInvestigations]);

  // Sync if initialId changes
  React.useEffect(() => {
    if (initialId) {
      setSelectedId(initialId);
    }
  }, [initialId]);

  const { data: investigation, isLoading, isError, error, isFetching } = useInvestigation(selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    router.push(`/investigations/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <SearchCode className="h-5 w-5 text-cyan-400" />
            Investigation Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous AI-powered threat investigation using NVIDIA Nemotron-70B via Nebius
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/alerts')}
          className="h-8 gap-2 border-slate-800 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
          Select Alert to Investigate
        </Button>
      </div>

      {/* Three-Panel Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* LEFT PANEL — Investigation Navigation */}
        <div className="xl:col-span-3">
          <Card className="border-slate-800 bg-slate-900/60 sticky top-20">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                Recent Investigations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {recentInvestigations.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No investigations yet. Select an alert to start.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentInvestigations.map((inv) => (
                    <InvestigationListItem
                      key={inv.id}
                      investigation={inv}
                      isSelected={inv.id === selectedId}
                      onClick={() => handleSelect(inv.id)}
                    />
                  ))}
                </div>
              )}

              {/* Alert Metadata when selected */}
              {investigation && (
                <>
                  <Separator className="my-4 bg-slate-800" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase text-slate-500">Alert Details</p>
                    <div className="rounded-lg bg-slate-800/60 p-3 space-y-2">
                      <div>
                        <p className="text-[10px] text-slate-500">Alert ID</p>
                        <p className="text-xs font-mono text-slate-200">{investigation.alert_id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Model</p>
                        <p className="text-[11px] font-mono text-cyan-400 break-all">{investigation.model_id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Steps Completed</p>
                        <p className="text-xs font-mono text-slate-200">
                          {investigation.steps.filter((s) => s.status === 'completed').length} / {investigation.steps.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CENTER PANEL — Timeline */}
        <div className="xl:col-span-5">
          {!selectedId ? (
            <EmptyState
              title="No investigation selected"
              description="Choose a recent investigation from the left panel, or select an alert from the Alerts Center to launch a new Nemotron-powered investigation."
            />
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner label="Loading investigation…" />
            </div>
          ) : isError ? (
            <ErrorState
              title="Failed to load investigation"
              message={error instanceof Error ? error.message : 'Unknown error'}
              onRetry={() => queryClient.invalidateQueries({ queryKey: ['investigation', selectedId] })}
            />
          ) : investigation ? (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="flex items-center justify-between">
                <JobStatusBanner
                  status={investigation.status}
                  errorMessage={investigation.error_message}
                />
              </div>
              {isFetching && !TERMINAL_STATUSES.includes(investigation.status) && (
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Polling for updates every 3s…
                </div>
              )}

              {/* Timeline */}
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <CardTitle className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                    Agent Execution Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <InvestigationTimeline steps={investigation.steps} />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* RIGHT PANEL — Findings */}
        <div className="xl:col-span-4">
          {investigation ? (
            <FindingsPanel
              findings={investigation.findings}
              recommendations={investigation.recommendations}
              confidenceScore={investigation.confidence_score}
              modelId={investigation.model_id}
              investigationId={investigation.id}
              reportUrl={investigation.report_url}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-10 text-center min-h-[300px]">
              <SearchCode className="h-8 w-8 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">Findings and recommendations will appear here once an investigation is selected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
