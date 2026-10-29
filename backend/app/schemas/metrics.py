"""Schemas for Metrics and Benchmarks."""

from typing import List, Optional
from pydantic import BaseModel, Field


class MetricsOverviewResponse(BaseModel):
    total_alerts: int
    active_investigations: int
    completed_investigations: int
    failed_investigations: int
    model_provider: str
    model_name: str
    real_nebius_connected: bool
    average_investigation_latency_ms: Optional[float] = None


class BenchmarkItem(BaseModel):
    id: str
    name: str
    category: str
    description: str
    detection_target: str
    synthetic_data_available: bool = True
