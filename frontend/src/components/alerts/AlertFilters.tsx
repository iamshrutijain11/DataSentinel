'use client';

import React from 'react';
import type { Severity, AlertStatus } from '@/lib/contracts/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, SlidersHorizontal } from 'lucide-react';

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const STATUSES: AlertStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'];
const DETECTION_TYPES = [
  'Command & Control',
  'Data Exfiltration',
  'Lateral Movement',
  'Brute Force',
  'SQL Injection',
  'Port Scan',
  'Anomalous Traffic',
  'DDoS',
];

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'border-red-800 bg-red-950/50 text-red-300',
  HIGH: 'border-orange-800 bg-orange-950/50 text-orange-300',
  MEDIUM: 'border-yellow-800 bg-yellow-950/50 text-yellow-300',
  LOW: 'border-blue-800 bg-blue-950/50 text-blue-300',
  INFO: 'border-slate-700 bg-slate-800/50 text-slate-400',
};

export interface AlertFiltersState {
  search: string;
  severities: Severity[];
  status: AlertStatus | '';
  detection_type: string;
}

interface AlertFiltersProps {
  filters: AlertFiltersState;
  onChange: (next: AlertFiltersState) => void;
}

export function AlertFilters({ filters, onChange }: AlertFiltersProps) {
  const toggleSeverity = (sev: Severity) => {
    const next = filters.severities.includes(sev)
      ? filters.severities.filter((s) => s !== sev)
      : [...filters.severities, sev];
    onChange({ ...filters, severities: next });
  };

  const hasFilters =
    filters.search !== '' ||
    filters.severities.length > 0 ||
    filters.status !== '' ||
    filters.detection_type !== '';

  const reset = () =>
    onChange({ search: '', severities: [], status: '', detection_type: '' });

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {hasFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="ml-auto h-6 gap-1 text-xs text-slate-500 hover:text-slate-300 px-2"
          >
            <X className="h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <Input
          type="search"
          placeholder="Search IP, description, alert ID…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 h-9 text-xs bg-slate-900 border-slate-700 placeholder:text-slate-600 text-slate-200 focus-visible:ring-cyan-500/50"
        />
      </div>

      {/* Severity Toggles */}
      <div>
        <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Severity</p>
        <div className="flex flex-wrap gap-2">
          {SEVERITIES.map((sev) => {
            const isActive = filters.severities.includes(sev);
            return (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                className={`text-[11px] font-semibold rounded-md border px-2.5 py-1 transition-all ${
                  isActive
                    ? SEVERITY_COLORS[sev]
                    : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
                }`}
                aria-pressed={isActive}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Status</p>
        <Select
          value={filters.status}
          onValueChange={(v) => onChange({ ...filters, status: (v ?? '') as AlertStatus | '' })}
        >
          <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-700 text-slate-200 focus:ring-cyan-500/50">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-xs text-slate-400">Any status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs text-slate-200">
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Detection Type */}
      <div>
        <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">Detection Type</p>
        <Select
          value={filters.detection_type}
          onValueChange={(v) => onChange({ ...filters, detection_type: v ?? '' })}
        >
          <SelectTrigger className="h-9 text-xs bg-slate-900 border-slate-700 text-slate-200 focus:ring-cyan-500/50">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            <SelectItem value="" className="text-xs text-slate-400">All types</SelectItem>
            {DETECTION_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-xs text-slate-200">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
          {filters.search && (
            <Badge
              variant="outline"
              className="text-[10px] border-slate-700 text-slate-400 gap-1 cursor-pointer hover:border-slate-600"
              onClick={() => onChange({ ...filters, search: '' })}
            >
              search: {filters.search.slice(0, 20)}{filters.search.length > 20 ? '…' : ''}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filters.status && (
            <Badge
              variant="outline"
              className="text-[10px] border-slate-700 text-slate-400 gap-1 cursor-pointer hover:border-slate-600"
              onClick={() => onChange({ ...filters, status: '' })}
            >
              {filters.status}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {filters.detection_type && (
            <Badge
              variant="outline"
              className="text-[10px] border-slate-700 text-slate-400 gap-1 cursor-pointer hover:border-slate-600"
              onClick={() => onChange({ ...filters, detection_type: '' })}
            >
              {filters.detection_type}
              <X className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
