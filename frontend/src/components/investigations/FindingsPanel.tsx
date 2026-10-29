'use client';

import React from 'react';
import type { Finding, Severity } from '@/lib/contracts/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Shield,
  Lightbulb,
  Download,
  Cpu,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'border-red-800 bg-red-950/60 text-red-300',
  HIGH: 'border-orange-800 bg-orange-950/60 text-orange-300',
  MEDIUM: 'border-yellow-800 bg-yellow-950/60 text-yellow-300',
  LOW: 'border-blue-800 bg-blue-950/60 text-blue-300',
  INFO: 'border-slate-700 bg-slate-800 text-slate-400',
};

interface FindingsPanelProps {
  findings: Finding[];
  recommendations: string[];
  confidenceScore: number | null;
  modelId: string;
  investigationId: string;
  reportUrl: string | null;
}

export function FindingsPanel({
  findings,
  recommendations,
  confidenceScore,
  modelId,
  investigationId,
  reportUrl,
}: FindingsPanelProps) {
  const handleExport = () => {
    const report = {
      investigation_id: investigationId,
      exported_at: new Date().toISOString(),
      model: modelId,
      confidence_score: confidenceScore,
      findings,
      recommendations,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${investigationId}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported', { description: `${investigationId}-report.json downloaded` });
  };

  return (
    <div className="space-y-4">
      {/* Model Info */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            Model Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Model</p>
            <p className="text-xs font-mono text-slate-200 break-all">{modelId}</p>
          </div>
          {confidenceScore !== null && (
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5">Confidence Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      confidenceScore >= 0.9
                        ? 'bg-emerald-500'
                        : confidenceScore >= 0.7
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                    style={{ width: `${(confidenceScore * 100).toFixed(0)}%` }}
                  />
                </div>
                <span className="text-sm font-bold font-mono text-slate-200">
                  {(confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {confidenceScore >= 0.9
                  ? 'High certainty — evidence strongly corroborates findings'
                  : confidenceScore >= 0.7
                  ? 'Moderate certainty — additional validation recommended'
                  : 'Low certainty — treat as preliminary assessment'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Findings */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-slate-400 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-red-400" />
            Key Findings
            <Badge variant="outline" className="ml-auto text-[10px] border-slate-700 text-slate-400 font-mono">
              {findings.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              Findings will appear as the investigation progresses.
            </p>
          ) : (
            <ScrollArea className="max-h-72">
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-200 leading-tight">{finding.title}</p>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] font-semibold shrink-0', SEVERITY_STYLES[finding.severity])}
                      >
                        {finding.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{finding.description}</p>
                    {finding.mitre_technique && (
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-indigo-400" />
                        <span className="text-[10px] font-mono text-indigo-400">{finding.mitre_technique}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500">Confidence:</span>
                      <span className="text-[10px] font-mono text-slate-300">
                        {(finding.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-56">
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Separator className="bg-slate-800" />

      {/* Export */}
      <Button
        onClick={handleExport}
        variant="outline"
        className="w-full gap-2 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9"
      >
        <Download className="h-3.5 w-3.5 text-cyan-400" />
        Export Investigation Report
      </Button>

      {reportUrl && (
        <p className="text-center text-[10px] text-slate-500">
          Full PDF report also available at{' '}
          <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
            {reportUrl}
          </a>
        </p>
      )}
    </div>
  );
}
