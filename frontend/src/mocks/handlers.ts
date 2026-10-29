import { http, HttpResponse } from 'msw';
import {
  mockOverviewMetrics,
  mockDatasets,
  mockAlerts,
  mockInvestigations,
  mockBenchmarks,
  mockHealthStatus,
  mockNetworkActivity,
} from './mockData';
import type { Alert, Investigation, Dataset } from '@/lib/contracts/types';

// In-memory state so mutations persist within session
const datasets: Dataset[] = [...mockDatasets];
const alerts: Alert[] = [...mockAlerts];
const investigations: Record<string, Investigation> = { ...mockInvestigations };

export const handlers = [
  // GET /api/v1/metrics/overview
  http.get('*/api/v1/metrics/overview', () => {
    return HttpResponse.json(mockOverviewMetrics);
  }),

  // GET /api/v1/datasets
  http.get('*/api/v1/datasets', () => {
    return HttpResponse.json(datasets);
  }),

  // GET /api/v1/datasets/:id
  http.get('*/api/v1/datasets/:id', ({ params }) => {
    const { id } = params;
    const dataset = datasets.find((d) => d.id === id);
    if (!dataset) {
      return new HttpResponse(JSON.stringify({ detail: 'Dataset not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return HttpResponse.json(dataset);
  }),

  // POST /api/v1/datasets/upload
  http.post('*/api/v1/datasets/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = file?.name || 'uploaded_stream.csv';
    const newId = `ds-user-${Date.now().toString(36)}`;

    const newDataset: Dataset = {
      id: newId,
      name: filename,
      status: 'PROCESSING',
      row_count: 50000,
      file_size_bytes: file ? file.size : 1048576,
      uploaded_at: new Date().toISOString(),
      processed_at: null,
      field_mappings: {
        timestamp: 'time_iso',
        source_ip: 'src_addr',
        destination_ip: 'dst_addr',
        protocol: 'proto',
        payload_bytes: 'length',
      },
      validation_errors: [],
      source_type: filename.endsWith('.pcap')
        ? 'Raw Packet Capture'
        : filename.endsWith('.json')
        ? 'JSON Security Stream'
        : 'CSV Flow Log',
    };

    datasets.unshift(newDataset);

    return HttpResponse.json({
      dataset_id: newId,
      message: 'Dataset uploaded successfully and queued for ingestion',
      status: 'PROCESSING',
      filename,
    });
  }),

  // GET /api/v1/alerts
  http.get('*/api/v1/alerts', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '10', 10);
    const status = url.searchParams.get('status');
    const detectionType = url.searchParams.get('detection_type');
    const severities = url.searchParams.get('severities')?.split(',').filter(Boolean);
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = [...alerts];

    if (status && status !== 'ALL') {
      filtered = filtered.filter((a) => a.status === status);
    }

    if (detectionType && detectionType !== 'ALL') {
      filtered = filtered.filter((a) => a.detection_type.toLowerCase() === detectionType.toLowerCase());
    }

    if (severities && severities.length > 0) {
      filtered = filtered.filter((a) => severities.includes(a.severity));
    }

    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.id.toLowerCase().includes(search) ||
          a.source_ip.toLowerCase().includes(search) ||
          a.destination_ip.toLowerCase().includes(search) ||
          a.detection_type.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      items: paginatedItems,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    });
  }),

  // GET /api/v1/alerts/:id
  http.get('*/api/v1/alerts/:id', ({ params }) => {
    const { id } = params;
    const alert = alerts.find((a) => a.id === id);
    if (!alert) {
      return new HttpResponse(JSON.stringify({ detail: 'Alert not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return HttpResponse.json(alert);
  }),

  // POST /api/v1/investigations
  http.post('*/api/v1/investigations', async ({ request }) => {
    const body = (await request.json()) as { alert_id: string; model_id?: string };
    const alertId = body.alert_id;
    const alert = alerts.find((a) => a.id === alertId);

    const invId = `INV-${Date.now().toString().slice(-6)}`;
    const newInvestigation: Investigation = {
      id: invId,
      alert_id: alertId,
      status: 'PLANNING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      model_id: body.model_id || 'nvidia/llama-3.1-nemotron-70b-instruct',
      confidence_score: 0.85,
      error_message: null,
      report_url: null,
      steps: [
        {
          step_number: 1,
          phase: 'PLANNING',
          tool_name: 'ThreatHypothesisGenerator',
          input_query: `Generate investigative playbook for alert ${alertId} (${alert?.detection_type || 'Unknown Vector'})`,
          output_summary: 'Synthesizing hypotheses and prioritizing relevant graph correlates.',
          status: 'running',
          execution_time_ms: 320,
          reasoning: 'Initiating autonomous threat exploration model using NVIDIA Nemotron 70B.',
        },
      ],
      findings: [],
      recommendations: [],
    };

    investigations[invId] = newInvestigation;

    if (alert) {
      alert.status = 'INVESTIGATING';
    }

    return HttpResponse.json(newInvestigation, { status: 201 });
  }),

  // GET /api/v1/investigations/:id
  http.get('*/api/v1/investigations/:id', ({ params }) => {
    const { id } = params as { id: string };
    const inv = investigations[id];

    if (!inv) {
      // If it looks like an ID, return a synthesized completed investigation
      const synthetic: Investigation = {
        id,
        alert_id: 'ALT-9041',
        status: 'COMPLETED',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date().toISOString(),
        model_id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        confidence_score: 0.92,
        error_message: null,
        report_url: `/reports/${id}-summary.pdf`,
        steps: [
          {
            step_number: 1,
            phase: 'PLANNING',
            tool_name: 'ThreatHypothesisGenerator',
            input_query: 'Deconstruct IOC signals and network flows',
            output_summary: 'Root cause verified: Remote code execution attempt followed by data exfiltration.',
            status: 'completed',
            execution_time_ms: 450,
            reasoning: 'Model correlated initial compromise with lateral staging.',
          },
        ],
        findings: [
          {
            id: 'f-syn-1',
            title: 'Critical Exploitation Attempt Verified',
            severity: 'CRITICAL',
            description: 'Suspicious payload confirmed active on host memory.',
            confidence: 0.92,
            mitre_technique: 'T1190 - Exploit Public-Facing Application',
          },
        ],
        recommendations: [
          'Quarantine host and review perimeter logs.',
          'Rotate exposed authentication secrets.',
        ],
      };
      return HttpResponse.json(synthetic);
    }

    return HttpResponse.json(inv);
  }),

  // GET /api/v1/benchmarks
  http.get('*/api/v1/benchmarks', () => {
    return HttpResponse.json(mockBenchmarks);
  }),

  // GET /api/v1/health
  http.get('*/api/v1/health', () => {
    return HttpResponse.json(mockHealthStatus);
  }),

  // GET /api/v1/network/activity
  http.get('*/api/v1/network/activity', () => {
    return HttpResponse.json(mockNetworkActivity);
  }),
];
