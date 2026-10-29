'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldAlert,
  SearchCode,
  Database,
  Activity,
  Gauge,
  Server,
  Terminal,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/StatusDot';

const navigationItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: ShieldAlert,
    badge: '42 High',
  },
  {
    name: 'Investigations',
    href: '/investigations',
    icon: SearchCode,
    badge: '3 Active',
  },
  {
    name: 'Datasets',
    href: '/datasets',
    icon: Database,
    badge: null,
  },
  {
    name: 'Network Activity',
    href: '/network',
    icon: Activity,
    badge: null,
  },
  {
    name: 'Benchmarks',
    href: '/benchmarks',
    icon: Gauge,
    badge: 'H100',
  },
  {
    name: 'System Status',
    href: '/status',
    icon: Server,
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-[#070d19] text-slate-200">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 text-slate-950 shadow-md shadow-cyan-500/20">
          <Terminal className="h-5 w-5 font-bold" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-white text-base">
              DataSentinel
            </span>
            <span className="rounded bg-cyan-950 px-1 py-0.2 text-[10px] font-mono font-semibold text-cyan-400 border border-cyan-800/60">
              2.0
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Nebius × NVIDIA AI
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Cybersecurity Core
        </div>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-slate-800/80 text-cyan-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-mono text-[10px] py-0 px-1.5',
                      isActive
                        ? 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Model & Inference Info Footer */}
      <div className="border-t border-slate-800 p-4 bg-[#050a14]">
        <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>Nemotron-70B</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot status="healthy" />
              <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Inference:</span>
            <span className="text-cyan-400 font-semibold">18.4ms</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono mt-0.5">
            <span>Cluster:</span>
            <span className="text-slate-300">Nebius H100</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
