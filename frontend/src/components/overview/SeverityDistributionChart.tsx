'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { SeverityCount, Severity } from '@/lib/contracts/types';

interface SeverityDistributionChartProps {
  data: SeverityCount[];
}

const colorMap: Record<Severity, string> = {
  CRITICAL: '#f87171',
  HIGH: '#fb923c',
  MEDIUM: '#facc15',
  LOW: '#38bdf8',
  INFO: '#94a3b8',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SeverityCount;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: colorMap[data.severity] }}
          />
          <span className="font-semibold text-xs text-white uppercase tracking-wider font-mono">
            {data.severity}
          </span>
        </div>
        <p className="text-xs text-slate-300 font-mono">
          Count: <span className="font-bold text-white">{data.count.toLocaleString()}</span> ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

export function SeverityDistributionChart({ data }: SeverityDistributionChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-white">
          Severity Breakdown
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Proportional impact ratio across active events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative h-[220px] w-full sm:w-[55%]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {data.map((entry) => (
                    <Cell
                      key={`cell-${entry.severity}`}
                      fill={colorMap[entry.severity] || '#94a3b8'}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold font-mono text-white">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Total
              </span>
            </div>
          </div>

          <div className="w-full sm:w-[45%] space-y-2">
            {data.map((item) => (
              <div
                key={item.severity}
                className="flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colorMap[item.severity] }}
                  />
                  <span className="text-slate-300 capitalize">{item.severity.toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{item.count}</span>
                  <span className="text-slate-400 text-[10px]">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
