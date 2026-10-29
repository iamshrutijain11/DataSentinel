'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Search,
  ChevronRight,
  Shield,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusDot } from '@/components/shared/StatusDot';

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Executive Security Overview',
  '/alerts': 'Real-Time Threat Detections',
  '/investigations': 'AI Threat Investigation Workspace',
  '/datasets': 'Dataset Telemetry Ingestion',
  '/network': 'Network Traffic Analysis',
  '/benchmarks': 'Inference & Model Benchmarks',
  '/status': 'Cluster & Pipeline Health',
};

export function TopBar() {
  const pathname = usePathname();
  const currentTitle = pageTitleMap[pathname] || 'Cybersecurity Workspace';

  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#070d19]/90 px-6 backdrop-blur-md">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex items-center gap-4">
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs text-slate-400">
          <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
            DataSentinel
          </Link>
          {segments.map((segment, index) => {
            const href = `/${segments.slice(0, index + 1).join('/')}`;
            const isLast = index === segments.length - 1;
            return (
              <React.Fragment key={href}>
                <ChevronRight className="h-3 w-3 mx-1 text-slate-600" />
                {isLast ? (
                  <span className="font-medium text-slate-200 capitalize">
                    {segment.replace('-', ' ')}
                  </span>
                ) : (
                  <Link href={href} className="hover:text-cyan-400 transition-colors capitalize">
                    {segment.replace('-', ' ')}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
        <span className="text-slate-700 hidden sm:inline">|</span>
        <h1 className="text-sm font-semibold tracking-tight text-white">
          {currentTitle}
        </h1>
      </div>

      {/* Right: Search, Global Actions, Status, Notifications */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="search"
            placeholder="Search IPs, CVEs, alerts..."
            className="h-8 pl-8 pr-3 text-xs bg-slate-900 border-slate-800 text-slate-200 focus-visible:ring-cyan-500 placeholder:text-slate-500"
          />
        </div>

        {/* Quick Action Button */}
        <Link href="/datasets">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Ingest Data</span>
          </Button>
        </Link>

        {/* Live Cluster Status Indicator */}
        <Link
          href="/status"
          className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs hover:border-slate-700 transition-colors"
        >
          <StatusDot status="healthy" />
          <span className="text-[11px] font-mono font-medium text-slate-300 hidden sm:inline">
            SYSTEM HEALTHY
          </span>
          <span className="text-[10px] font-mono text-cyan-400">4.2ms</span>
        </Link>

        {/* Notifications Bell */}
        <Button
          size="icon"
          variant="ghost"
          className="relative h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
        </Button>

        {/* User / Org Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-700 text-xs font-bold text-white shadow-inner">
          <Shield className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
