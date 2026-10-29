export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export type DatasetStatus = 'UPLOADING' | 'VALIDATING' | 'PROCESSING' | 'READY' | 'FAILED';

export type InvestigationStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'EVIDENCE_COLLECTION'
  | 'HYPOTHESIS_TESTING'
  | 'REPORT_GENERATION'
  | 'COMPLETED'
  | 'FAILED';

export interface AlertTrendPoint {
  timestamp: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info?: number;
}

export interface SeverityCount {
  severity: Severity;
  count: number;
  percentage: number;
}

export interface SourceCount {
  ip: string;
  count: number;
  country: string;
  last_seen: string;
  asn?: string;
}

export interface InvestigationSummary {
  id: string;
  alert_id: string;
  detection_type: string;
  status: InvestigationStatus;
  created_at: string;
  model_id: string;
  confidence_score: number | null;
}

export interface OverviewMetrics {
  total_events: number;
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  datasets_analyzed: number;
  throughput_eps: number;
  active_investigations: number;
  alert_trends: AlertTrendPoint[];
  severity_distribution: SeverityCount[];
  top_sources: SourceCount[];
  recent_investigations: InvestigationSummary[];
}

export interface Dataset {
  id: string;
  name: string;
  status: DatasetStatus;
  row_count: number | null;
  file_size_bytes: number;
  uploaded_at: string;
  processed_at: string | null;
  field_mappings: Record<string, string>;
  validation_errors: string[];
  source_type: string;
}

export interface UploadResponse {
  dataset_id: string;
  message: string;
  status: DatasetStatus;
  filename: string;
}

export interface Evidence {
  id: string;
  timestamp: string;
  type: string;
  detail: string;
  raw_payload?: string;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: Severity;
  detection_type: string;
  source_ip: string;
  destination_ip: string;
  source_port: number;
  destination_port: number;
  protocol: string;
  risk_score: number; // 0-100
  status: AlertStatus;
  description: string;
  evidence: Evidence[];
  dataset_id: string;
  alert_count: number;
}

export interface AlertsPage {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AlertFilters {
  severities?: Severity[];
  status?: AlertStatus;
  detection_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface InvestigationStep {
  step_number: number;
  phase: string;
  tool_name: string;
  input_query: string;
  output_summary: string;
  status: 'running' | 'completed' | 'failed';
  execution_time_ms: number;
  reasoning: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  confidence: number;
  mitre_technique?: string;
}

export interface Investigation {
  id: string;
  alert_id: string;
  status: InvestigationStatus;
  created_at: string;
  updated_at: string;
  model_id: string;
  steps: InvestigationStep[];
  findings: Finding[];
  recommendations: string[];
  confidence_score: number | null;
  error_message: string | null;
  report_url: string | null;
}

export interface CreateInvestigationPayload {
  alert_id: string;
  model_id?: string;
}

export interface MLMetricPoint {
  dataset: string;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
}

export interface ThroughputPoint {
  dataset_size_k: number;
  rows_per_sec: number;
}

export interface ModelComparison {
  name: string;
  provider: string;
  latency_ms: number;
  f1_score: number;
  throughput_eps: number;
}

export interface Benchmarks {
  summary: {
    model_name: string;
    latency_p50_ms: number;
    latency_p95_ms: number;
    peak_memory_mb: number;
    throughput_tokens_sec: number;
    overall_f1: number;
  };
  ml_metrics: MLMetricPoint[];
  throughput_curve: ThroughputPoint[];
  models_compared: ModelComparison[];
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency_ms: number;
  uptime_percent: number;
  last_check: string;
  version?: string;
}

export interface ErrorEntry {
  id: string;
  timestamp: string;
  service: string;
  message: string;
  severity: 'warn' | 'error' | 'critical';
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  backend: ServiceStatus;
  pipeline: ServiceStatus;
  nebius_inference: ServiceStatus;
  model_id: string;
  last_job_completed_at: string | null;
  recent_errors: ErrorEntry[];
}

export interface TrafficPoint {
  timestamp: string;
  inbound_mbps: number;
  outbound_mbps: number;
  packets_sec: number;
}

export interface ProtocolCount {
  protocol: string;
  packets: number;
  percentage: number;
}

export interface HostPair {
  source_ip: string;
  dest_ip: string;
  bytes_transferred: number;
  flow_count: number;
  risk_level: Severity;
}

export interface SuspiciousWindow {
  start_time: string;
  end_time: string;
  anomaly_score: number;
  alert_count: number;
  primary_vector: string;
}

export interface DestinationGeo {
  country: string;
  region: string;
  connections: number;
  threat_score: number;
}

export interface NetworkActivity {
  traffic_history: TrafficPoint[];
  protocol_distribution: ProtocolCount[];
  top_hosts: HostPair[];
  suspicious_windows: SuspiciousWindow[];
  destination_map: DestinationGeo[];
}
