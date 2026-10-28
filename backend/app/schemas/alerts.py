"""Schemas for Alerts and evidence."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AlertBase(BaseModel):
    id: str
    title: str
    severity: str = Field(..., description="low, medium, high, critical")
    status: str = Field("OPEN", description="OPEN, INVESTIGATING, RESOLVED, CLOSED")
    description: str
    source: str
    dataset_id: Optional[str] = None
    host_identifier: Optional[str] = None
    anomaly_score: float = 0.0
    timestamp: str
    evidence_count: int = 0
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AlertCreate(BaseModel):
    id: Optional[str] = None
    title: str
    severity: str
    description: str
    source: str
    dataset_id: Optional[str] = None
    host_identifier: Optional[str] = None
    anomaly_score: float = 0.0
    timestamp: Optional[str] = None
    evidence_count: int = 0
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AlertRead(AlertBase):
    created_at: str


class AlertListResponse(BaseModel):
    items: List[AlertRead]
    total: int
    skip: int
    limit: int
