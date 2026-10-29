'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { MetricCard } from '@/components/overview/MetricCard';
import { AlertTrendChart } from '@/components/overview/AlertTrendChart';
import { SeverityDistributionChart } from '@/components/overview/SeverityDistributionChart';
import { TopSourcesTable } from '@/components/overview/TopSourcesTable';
import { RecentInvestigations } from '@/components/overview/RecentInvestigations';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  Activity,
  ShieldAlert,
  Database,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const {
    data: metrics,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['overview'],
    queryFn: api.getOverviewMetrics,
  });

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingSpinner label="Aggregating cluster telemetry & threat intelligence..." size="lg" />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="py-12">
        <ErrorState
          title="Telemetry Feed Disruption"
          message={error instanceof Error ? error.message : 'Unable to retrieve overview metrics.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Enterprise Security Operations Center
            <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-mono font-medium text-cyan-400 border border-cyan-800/80">
              LIVE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time neural telemetry powered by Nebius Cloud & NVIDIA Nemotron-70B
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-2 border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Events Analyzed"
          value={metrics.total_events}
          badge={`${metrics.throughput_eps.toLocaleString()} EPS`}
          trend={{ value: '+14.2%', isPositive: false, label: 'vs last week' }}
          icon={<Activity className="h-4 w-4" />}
          description="Across 4 NetFlow streams"
        />

        <MetricCard
          title="Critical & High Alerts"
          value={metrics.critical_alerts + metrics.high_alerts}
          badge={`${metrics.critical_alerts} Critical`}
          trend={{ value: '+8.1%', isPositive: true, label: 'elevation' }}
          icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
          description="Requires immediate triage"
        />

        <MetricCard
          title="Datasets Ingested"
          value={metrics.datasets_analyzed}
          badge="CIC-IDS / UNSW"
          icon={<Database className="h-4 w-4 text-indigo-400" />}
          description="3 active, 1 validating"
        />

        <MetricCard
          title="Active Investigations"
          value={metrics.active_investigations}
          badge="Nemotron 70B"
          trend={{ value: '18.4ms', isPositive: false, label: 'avg latency' }}
          icon={<Cpu className="h-4 w-4 text-cyan-400" />}
          description="Autonomous agent loop"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AlertTrendChart data={metrics.alert_trends} />
        </div>
        <div className="lg:col-span-1">
          <SeverityDistributionChart data={metrics.severity_distribution} />
        </div>
      </div>

      {/* Row 3: Tables & Investigations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSourcesTable sources={metrics.top_sources} />
        <RecentInvestigations investigations={metrics.recent_investigations} />
      </div>
    </div>
  );
}
