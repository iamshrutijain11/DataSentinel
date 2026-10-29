'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Activity, Network, Users, AlertTriangle, Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Severity } from '@/lib/contracts/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const RISK_STYLES: Record<Severity, string> = {
  CRITICAL: 'border-red-800 bg-red-950/60 text-red-300',
  HIGH: 'border-orange-800 bg-orange-950/60 text-orange-300',
  MEDIUM: 'border-yellow-800 bg-yellow-950/60 text-yellow-300',
  LOW: 'border-blue-800 bg-blue-950/60 text-blue-300',
  INFO: 'border-slate-700 bg-slate-800 text-slate-400',
};

function formatBytes(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} Gbps`;
  return `${mb.toFixed(1)} Mbps`;
}

const CHART_COLORS = ['#22d3ee', '#818cf8', '#f87171', '#fb923c', '#facc15', '#34d399'];

// Custom Tooltip
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5 font-mono">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-mono text-slate-100">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function NetworkPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['network'],
    queryFn: api.getNetworkActivity,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            Network Activity
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time network telemetry aggregation — traffic patterns, protocols, and host behavior
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
          <LoadingSpinner label="Loading network telemetry…" />
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load network data" message={error instanceof Error ? error.message : 'Unknown'} onRetry={() => refetch()} />
      ) : data ? (
        <div className="space-y-6">
          {/* Traffic Over Time */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                Network Traffic Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.traffic_history} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      try { return format(new Date(v), 'HH:mm'); } catch { return v; }
                    }}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}M`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }} />
                  <Area type="monotone" dataKey="inbound_mbps" name="Inbound (Mbps)" stroke="#22d3ee" fill="url(#inboundGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="outbound_mbps" name="Outbound (Mbps)" stroke="#818cf8" fill="url(#outboundGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Protocol Distribution */}
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Network className="h-4 w-4 text-indigo-400" />
                  Protocol Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.protocol_distribution}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v}
                    />
                    <YAxis
                      dataKey="protocol"
                      type="category"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="packets" name="Packets" radius={[0, 4, 4, 0]}>
                      {data.protocol_distribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Suspicious Windows */}
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Suspicious Time Windows
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {data.suspicious_windows.map((win, i) => (
                    <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-slate-300">
                          {win.start_time} — {win.end_time}
                        </span>
                        <Badge variant="outline" className={cn(
                          'text-[10px] font-mono',
                          win.anomaly_score >= 0.8 ? 'border-red-800 text-red-300' :
                          win.anomaly_score >= 0.6 ? 'border-orange-800 text-orange-300' : 'border-yellow-800 text-yellow-300'
                        )}>
                          Score: {win.anomaly_score.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{win.primary_vector}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-500">{win.alert_count} alerts in window</span>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              win.anomaly_score >= 0.8 ? 'bg-red-500' :
                              win.anomaly_score >= 0.6 ? 'bg-orange-500' : 'bg-yellow-500'
                            )}
                            style={{ width: `${win.anomaly_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Communicating Hosts */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                Top Communicating Host Pairs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left pb-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Source</th>
                      <th className="text-left pb-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Destination</th>
                      <th className="text-right pb-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Bytes</th>
                      <th className="text-right pb-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Flows</th>
                      <th className="text-center pb-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_hosts.map((pair, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-mono text-slate-300">{pair.source_ip}</td>
                        <td className="py-2.5 font-mono text-slate-300">{pair.dest_ip}</td>
                        <td className="py-2.5 text-right font-mono text-slate-300">
                          {pair.bytes_transferred >= 1e9
                            ? `${(pair.bytes_transferred/1e9).toFixed(2)} GB`
                            : pair.bytes_transferred >= 1e6
                            ? `${(pair.bytes_transferred/1e6).toFixed(1)} MB`
                            : `${(pair.bytes_transferred/1e3).toFixed(0)} KB`}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-300">{pair.flow_count.toLocaleString()}</td>
                        <td className="py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', RISK_STYLES[pair.risk_level])}
                          >
                            {pair.risk_level}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Destination Geo */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-400" />
                Destination Geography
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.destination_map.slice(0, 8).map((geo, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-200">{geo.country}</span>
                      <span className={cn(
                        'text-[10px] font-mono',
                        geo.threat_score >= 70 ? 'text-red-400' :
                        geo.threat_score >= 40 ? 'text-orange-400' : 'text-slate-400'
                      )}>
                        T:{geo.threat_score}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{geo.region}</p>
                    <p className="text-xs font-mono text-cyan-400 mt-1">
                      {geo.connections.toLocaleString()} conns
                    </p>
                    <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          geo.threat_score >= 70 ? 'bg-red-500' :
                          geo.threat_score >= 40 ? 'bg-orange-500' : 'bg-cyan-500'
                        )}
                        style={{ width: `${Math.min(geo.threat_score, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
