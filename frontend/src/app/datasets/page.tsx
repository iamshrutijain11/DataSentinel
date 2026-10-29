'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { DatasetUploadZone } from '@/components/datasets/DatasetUploadZone';
import { DatasetTable } from '@/components/datasets/DatasetTable';
import { DatasetDetailPanel } from '@/components/datasets/DatasetDetailPanel';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Dataset } from '@/lib/contracts/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DatasetsPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data: datasets, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['datasets'],
    queryFn: api.getDatasets,
    refetchInterval: 5000, // poll for status changes
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            Dataset Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload, validate, and monitor security dataset ingestion pipelines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-2 border-slate-800 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowUpload((v) => !v)}
            className="h-8 gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            {showUpload ? 'Hide Upload' : 'Upload Dataset'}
          </Button>
        </div>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-semibold text-slate-200">
              Upload New Dataset
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DatasetUploadZone />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <LoadingSpinner label="Loading datasets…" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load datasets"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      ) : !datasets || datasets.length === 0 ? (
        <EmptyState
          title="No datasets yet"
          description="Upload your first security dataset to begin threat detection."
          actionLabel="Upload Dataset"
          onAction={() => setShowUpload(true)}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Dataset Table */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 font-mono">
                {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <DatasetTable
              datasets={datasets}
              onSelect={setSelectedDataset}
              selectedId={selectedDataset?.id}
            />
          </div>

          {/* Detail Panel */}
          <div className="xl:col-span-1">
            {selectedDataset ? (
              <DatasetDetailPanel dataset={selectedDataset} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-10 text-center h-full min-h-[200px]">
                <Database className="h-8 w-8 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">Select a dataset to inspect field mappings and validation status</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
