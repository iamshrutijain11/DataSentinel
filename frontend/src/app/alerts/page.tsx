'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import type { Alert, AlertFilters as ApiFilters } from '@/lib/contracts/types';
import { AlertsTable } from '@/components/alerts/AlertsTable';
import { AlertFilters } from '@/components/alerts/AlertFilters';
import type { AlertFiltersState } from '@/components/alerts/AlertFilters';
import { AlertDetailDrawer } from '@/components/alerts/AlertDetailDrawer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DEFAULT_FILTERS: AlertFiltersState = {
  search: '',
  severities: [],
  status: '',
  detection_type: '',
};

const PAGE_SIZE = 10;

export default function AlertsPage() {
  const [filters, setFilters] = useState<AlertFiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const apiFilters: ApiFilters = {
    page,
    page_size: PAGE_SIZE,
    search: filters.search || undefined,
    severities: filters.severities.length > 0 ? filters.severities : undefined,
    status: (filters.status || undefined) as ApiFilters['status'],
    detection_type: filters.detection_type || undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['alerts', apiFilters],
    queryFn: () => api.getAlerts(apiFilters),
    placeholderData: (prev) => prev,
  });

  const handleFiltersChange = (next: AlertFiltersState) => {
    setFilters(next);
    setPage(1);
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            Alerts Center
            {data && (
              <span className="rounded bg-red-950 px-2 py-0.5 text-xs font-mono text-red-400 border border-red-800/60">
                {data.total.toLocaleString()} total
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detected threats, anomalies, and suspicious events across all monitored datasets
          </p>
        </div>
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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="xl:col-span-1">
          <AlertFilters filters={filters} onChange={handleFiltersChange} />
        </div>

        {/* Main Table */}
        <div className="xl:col-span-3">
          {isError ? (
            <ErrorState
              title="Failed to load alerts"
              message={error instanceof Error ? error.message : 'Unknown error'}
              onRetry={() => refetch()}
            />
          ) : isLoading && !data ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner label="Loading alerts…" />
            </div>
          ) : (
            <AlertsTable
              alerts={data?.items ?? []}
              total={data?.total ?? 0}
              page={data?.page ?? page}
              pageSize={PAGE_SIZE}
              totalPages={data?.total_pages ?? 1}
              isLoading={isFetching && !data}
              onPageChange={setPage}
              onAlertClick={handleAlertClick}
              selectedId={selectedAlert?.id}
            />
          )}
        </div>
      </div>

      {/* Alert Detail Drawer */}
      <AlertDetailDrawer
        alert={selectedAlert}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
