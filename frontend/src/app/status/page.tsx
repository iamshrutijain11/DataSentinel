'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { ServiceStatus, HealthStatus } from '@/lib/contracts/types';
import {
  Server,
  Cpu,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/shared/StatusDot';

function ServiceCard({
  name,
  service,
  icon,
}: {
  name: string;
  service: ServiceStatus;
  icon: React.ReactNode;
}) {
  const statusIcon =
    service.status === 'up' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
    service.status === 'degraded' ? <MinusCircle className="h-4 w-4 text-yellow-400" /> :
    <XCircle className="h-4 w-4 text-red-400" />;

  const borderColor =
    service.status === 'up' ? 'border-emerald-800/60' :
    service.status === 'degraded' ? 'border-yellow-800/60' : 'border-red-800/60';

  return (
    <Card className={cn('bg-slate-900/60 border', borderColor)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{icon}</span>
            <span className="text-sm font-semibold text-slate-200">{name}</span>
          </div>
          {statusIcon}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Status</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold',
                service.status === 'up' ? 'border-emerald-800 text-emerald-300 bg-emerald-950/40' :
                service.status === 'degraded' ? 'border-yellow-800 text-yellow-300 bg-yellow-950/40' :
                'border-red-800 text-red-300 bg-red-950/40'
              )}
            >
              {service.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Latency</span>
            <span className="text-xs font-mono text-slate-300">{service.latency_ms}ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Uptime</span>
            <span className="text-xs font-mono text-slate-300">{service.uptime_percent.toFixed(2)}%</span>
          </div>
          {service.version && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">Version</span>
              <span className="text-xs font-mono text-cyan-400">{service.version}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Last check</span>
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(service.last_check), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Uptime Bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                service.status === 'up' ? 'bg-emerald-500' :
                service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${service.uptime_percent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ERROR_SEVERITY_STYLES = {
  critical: 'border-red-800 bg-red-950/30 text-red-300',
  error: 'border-orange-800 bg-orange-950/30 text-orange-300',
  warn: 'border-yellow-800 bg-yellow-950/30 text-yellow-300',
};

export default function StatusPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            System Status
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time health monitoring for backend, data pipeline, and Nebius inference
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-2">
              <StatusDot status={data.status === 'healthy' ? 'healthy' : data.status === 'degraded' ? 'degraded' : 'down'} />
              <span className={cn(
                'text-xs font-semibold font-mono',
                data.status === 'healthy' ? 'text-emerald-400' :
                data.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              )}>
                {data.status.toUpperCase()}
              </span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-2 border-slate-800 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner label="Checking service health…" />
        </div>
      ) : isError ? (
        <ErrorState title="Health check failed" message={error instanceof Error ? error.message : 'Cannot reach backend'} onRetry={() => refetch()} />
      ) : data ? (
        <div className="space-y-6">
          {/* Service Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ServiceCard
              name="FastAPI Backend"
              service={data.backend}
              icon={<Server className="h-4 w-4" />}
            />
            <ServiceCard
              name="Data Pipeline"
              service={data.pipeline}
              icon={<Activity className="h-4 w-4" />}
            />
            <ServiceCard
              name="Nebius Inference"
              service={data.nebius_inference}
              icon={<Cpu className="h-4 w-4" />}
            />
          </div>

          {/* Model & Last Job */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  Active Model Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-300">NVIDIA Nemotron-70B</span>
                    <Badge variant="outline" className="border-cyan-800 text-cyan-300 bg-cyan-950/40 text-[10px]">
                      ACTIVE
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-cyan-400 break-all">{data.model_id}</p>
                  <Separator className="my-3 bg-slate-700/60" />
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500">Provider</span>
                      <p className="text-slate-200 font-mono mt-0.5">Nebius AI</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Cluster</span>
                      <p className="text-slate-200 font-mono mt-0.5">H100 SXM5</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Last Completed Job
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {data.last_job_completed_at ? (
                  <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-300">Job Completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(data.last_job_completed_at), { addSuffix: true })}
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-2">{data.last_job_completed_at}</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-4 text-center">
                    <p className="text-xs text-slate-500">No jobs completed yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Error Log */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                Recent Errors &amp; Warnings
                {data.recent_errors.length > 0 && (
                  <Badge variant="outline" className="ml-auto text-[10px] border-orange-800 text-orange-300">
                    {data.recent_errors.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data.recent_errors.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400 py-4">
                  <CheckCircle2 className="h-4 w-4" />
                  No recent errors — all systems nominal
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {data.recent_errors.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'rounded-lg border px-4 py-3',
                          ERROR_SEVERITY_STYLES[entry.severity]
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold font-mono">{entry.service}</span>
                          <span className="text-[10px] text-slate-500">
                            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{entry.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
