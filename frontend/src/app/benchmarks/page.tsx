'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Gauge, Cpu, Zap, MemoryStick, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5 font-mono">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-mono text-slate-100">{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function MetricItem({ label, value, unit, available = true }: { label: string; value: string | number | null; unit?: string; available?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      {!available || value === null ? (
        <div className="flex items-center gap-1.5 text-slate-600">
          <HelpCircle className="h-3 w-3" />
          <span className="text-xs font-mono">Not measured</span>
        </div>
      ) : (
        <span className="text-xs font-mono font-semibold text-slate-200">
          {value}{unit ? ` ${unit}` : ''}
        </span>
      )}
    </div>
  );
}

export default function BenchmarksPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['benchmarks'],
    queryFn: api.getBenchmarks,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Gauge className="h-5 w-5 text-cyan-400" />
            Benchmarks
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Measured performance metrics for NVIDIA Nemotron-70B on Nebius H100 SXM5 infrastructure
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

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner label="Loading benchmarks…" />
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load benchmarks" message={error instanceof Error ? error.message : 'Unknown'} onRetry={() => refetch()} />
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Model', value: 'Nemotron-70B', icon: <Cpu className="h-4 w-4 text-cyan-400" />, sub: 'Nebius H100 SXM5' },
              { label: 'Overall F1', value: `${(data.summary.overall_f1 * 100).toFixed(1)}%`, icon: <Gauge className="h-4 w-4 text-emerald-400" />, sub: 'Across all datasets' },
              { label: 'Throughput', value: `${data.summary.throughput_tokens_sec.toFixed(0)} tok/s`, icon: <Zap className="h-4 w-4 text-yellow-400" />, sub: 'Token generation rate' },
              { label: 'Latency P50', value: `${data.summary.latency_p50_ms}ms`, icon: <MemoryStick className="h-4 w-4 text-indigo-400" />, sub: `P95: ${data.summary.latency_p95_ms}ms` },
            ].map((card) => (
              <Card key={card.label} className="border-slate-800 bg-slate-900/60">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    {card.icon}
                    <span className="text-xs text-slate-400">{card.label}</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-slate-100">{card.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ML Metrics Chart */}
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  ML Performance by Dataset
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.ml_metrics} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="dataset"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0.9, 1]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
                    <Bar dataKey="precision" name="Precision" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="recall" name="Recall" fill="#818cf8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="f1" name="F1 Score" fill="#34d399" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Throughput Curve */}
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  Processing Throughput vs Dataset Size
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.throughput_curve} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="dataset_size_k"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}K`}
                      label={{ value: 'Dataset rows (K)', position: 'insideBottom', fill: '#475569', fontSize: 10, dy: 16 }}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v.toLocaleString()}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="rows_per_sec"
                      name="Rows / sec"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={{ fill: '#22d3ee', r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  Inference Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <MetricItem label="Model" value={data.summary.model_name} />
                <MetricItem label="Latency P50" value={data.summary.latency_p50_ms} unit="ms" />
                <MetricItem label="Latency P95" value={data.summary.latency_p95_ms} unit="ms" />
                <MetricItem label="Throughput" value={data.summary.throughput_tokens_sec.toFixed(1)} unit="tok/s" />
                <MetricItem label="Peak Memory" value={data.summary.peak_memory_mb} unit="MB" />
                <MetricItem label="Overall F1" value={`${(data.summary.overall_f1 * 100).toFixed(2)}%`} />
              </CardContent>
            </Card>

            {/* Model Comparison */}
            {data.models_compared.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader className="pb-3 border-b border-slate-800">
                  <CardTitle className="text-sm font-semibold text-slate-200">
                    Model Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {data.models_compared.map((model, i) => (
                      <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-200">{model.name}</p>
                            <p className="text-[10px] text-slate-500">{model.provider}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                            F1: {(model.f1_score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div>
                            <span className="text-slate-500">Latency: </span>
                            <span className="text-slate-300">{model.latency_ms}ms</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Throughput: </span>
                            <span className="text-slate-300">{model.throughput_eps} EPS</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
