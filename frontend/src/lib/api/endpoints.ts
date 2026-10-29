import { apiClient } from './client';
import type {
  OverviewMetrics,
  Dataset,
  UploadResponse,
  Alert,
  AlertsPage,
  AlertFilters,
  Investigation,
  CreateInvestigationPayload,
  Benchmarks,
  HealthStatus,
  NetworkActivity,
} from '@/lib/contracts/types';

export const api = {
  getOverviewMetrics: () =>
    apiClient<OverviewMetrics>('/api/v1/metrics/overview'),

  getDatasets: () =>
    apiClient<Dataset[]>('/api/v1/datasets'),

  getDataset: (id: string) =>
    apiClient<Dataset>(`/api/v1/datasets/${id}`),

  uploadDataset: (formData: FormData) =>
    apiClient<UploadResponse>('/api/v1/datasets/upload', {
      method: 'POST',
      body: formData,
    }),

  getAlerts: (filters: AlertFilters = {}) =>
    apiClient<AlertsPage>('/api/v1/alerts', {
      params: {
        page: filters.page,
        page_size: filters.page_size,
        status: filters.status,
        detection_type: filters.detection_type,
        search: filters.search,
        severities: filters.severities?.join(','),
      },
    }),

  getAlert: (id: string) =>
    apiClient<Alert>(`/api/v1/alerts/${id}`),

  createInvestigation: (payload: CreateInvestigationPayload) =>
    apiClient<Investigation>('/api/v1/investigations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getInvestigation: (id: string) =>
    apiClient<Investigation>(`/api/v1/investigations/${id}`),

  getBenchmarks: () =>
    apiClient<Benchmarks>('/api/v1/benchmarks'),

  getHealth: () =>
    apiClient<HealthStatus>('/api/v1/health'),

  getNetworkActivity: () =>
    apiClient<NetworkActivity>('/api/v1/network/activity'),
};
