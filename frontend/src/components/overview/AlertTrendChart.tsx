'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { AlertTrendPoint } from '@/lib/contracts/types';

interface AlertTrendChartProps {
  data: AlertTrendPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md">
        <p className="mb-2 text-xs font-mono font-semibold text-slate-200">
          Date: {label}
        </p>
        <div className="space-y-1">
          {payload.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-300 capitalize">{entry.name}:</span>
              </div>
              <span className="font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function AlertTrendChart({ data }: AlertTrendChartProps) {
  return (
    <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-white">
              7-Day Alert Velocity & Severity Trend
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Correlated threat volume across network perimeters
            </CardDescription>
          </div>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-cyan-400 border border-slate-700">
            Live Stream
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timestamp"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#334155' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="critical"
                name="Critical"
                stroke="#f87171"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f87171' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="high"
                name="High"
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fb923c' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="medium"
                name="Medium"
                stroke="#facc15"
                strokeWidth={1.5}
                dot={{ r: 2, fill: '#facc15' }}
              />
              <Line
                type="monotone"
                dataKey="low"
                name="Low"
                stroke="#38bdf8"
                strokeWidth={1.5}
                dot={{ r: 2, fill: '#38bdf8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
