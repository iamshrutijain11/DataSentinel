'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Globe, ArrowUpRight } from 'lucide-react';
import type { SourceCount } from '@/lib/contracts/types';
import Link from 'next/link';

interface TopSourcesTableProps {
  sources: SourceCount[];
}

export function TopSourcesTable({ sources }: TopSourcesTableProps) {
  return (
    <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-white">
              Top Incident Originating Hosts
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              High-frequency attack sources and internal infected nodes
            </CardDescription>
          </div>
          <Link
            href="/alerts"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            <span>View All Alerts</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-[180px]">Source IP</TableHead>
                <TableHead>Location / Autonomous System</TableHead>
                <TableHead className="text-right">Detections</TableHead>
                <TableHead className="text-right">Last Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {sources.map((source) => (
                <TableRow
                  key={source.ip}
                  className="border-slate-800/80 hover:bg-slate-800/40 transition-colors"
                >
                  <TableCell className="font-mono font-medium text-cyan-300">
                    {source.ip}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{source.country}</span>
                      {source.asn && (
                        <span className="text-slate-400 text-[11px] font-mono">
                          • {source.asn}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-white">
                    {source.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-slate-400 font-mono text-[11px]">
                    {source.last_seen}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
