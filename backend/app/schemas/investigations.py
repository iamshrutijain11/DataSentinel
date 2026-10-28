"""Pydantic schemas for AI Investigations, Hypotheses, Evidence, and Reports."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InvestigationState(str, Enum):
    QUEUED = "QUEUED"
    PLANNING = "PLANNING"
    EVIDENCE_COLLECTION = "EVIDENCE_COLLECTION"
    HYPOTHESIS_TESTING = "HYPOTHESIS_TESTING"
    REPORT_GENERATION = "REPORT_GENERATION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class HypothesisStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    REFUTED = "REFUTED"
    INCONCLUSIVE = "INCONCLUSIVE"


class TimelineEvent(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 timestamp of the observed event")
    event_id: str = Field(..., description="ID of the underlying log or network event")
    description: str = Field(..., description="Defensible description grounded in evidence")
    source: str = Field(..., description="Source log stream e.g., zeek_conn, auth_log, netflow")
    evidence_ref: str = Field(..., description="Evidence reference tag matching evidence items")


class HypothesisItem(BaseModel):
    id: str = Field(..., description="Identifier e.g., H1, H2")
    hypothesis: str = Field(..., description="Short hypothesis title")
    explanation: str = Field(..., description="Detailed description of the plausible scenario")
    status: HypothesisStatus = Field(..., description="SUPPORTED, REFUTED, or INCONCLUSIVE")
    supporting_evidence_ids: List[str] = Field(default_factory=list, description="Evidence IDs directly supporting this scenario")
    contradicting_evidence_ids: List[str] = Field(default_factory=list, description="Evidence IDs contradicting or ruling out this scenario")
    reasoning: str = Field(..., description="Analytical justification distinguishing this from alternatives")


class KeyFindingItem(BaseModel):
    id: str = Field(..., description="Finding identifier e.g., F1, F2")
    finding: str = Field(..., description="Factual finding statement")
    evidence_ids: List[str] = Field(..., description="Referenced evidence item IDs")
    timestamps: List[str] = Field(..., description="Real event timestamps relevant to this finding")
    significance: str = Field(..., description="Security significance (benign indicator, suspicious, IOC)")


class EvidenceItem(BaseModel):
    evidence_id: str = Field(..., description="Unique evidence identifier e.g., EV-NET-01")
    event_id: Optional[str] = Field(None, description="Raw event ID if available")
    timestamp: str = Field(..., description="Event timestamp")
    data_source: str = Field(..., description="Sensor or log source")
    summary: str = Field(..., description="Bounded summary of the evidence record")
    raw_details: Dict[str, Any] = Field(default_factory=dict, description="Key attributes extracted safely")


class QualitativeConfidence(BaseModel):
    level: str = Field(..., description="LOW, MEDIUM, HIGH (heuristic label, not calibrated probability)")
    type: str = Field("heuristic_qualitative", description="Explicitly marks confidence as qualitative")
    rationale: str = Field(..., description="Analytical rationale explaining why this confidence was assessed")


class ResponseRecommendation(BaseModel):
    action: str = Field(..., description="Recommended defensive action")
    priority: str = Field(..., description="IMMEDIATE, HIGH, MEDIUM, LOW")
    category: str = Field(..., description="INVESTIGATE, VALIDATE, ISOLATE_WITH_APPROVAL, ESCALATE")
    justification: str = Field(..., description="Why this action is justified based on evidence")
    requires_human_authorization: bool = Field(True, description="Strict safety guard: true for non-destructive containment")


class ModelMetadata(BaseModel):
    provider: str = Field(..., description="'nebius' or 'mock_nemotron'")
    model_id: str = Field(..., description="Model ID executed (e.g. nvidia/llama-3.1-nemotron-70b-instruct)")
    latency_ms: Optional[float] = Field(None, description="Inference turnaround latency in milliseconds")
    tokens_prompt: Optional[int] = Field(None, description="Prompt tokens used")
    tokens_completion: Optional[int] = Field(None, description="Completion tokens generated")
    tokens_total: Optional[int] = Field(None, description="Total tokens used")
    real_call_succeeded: bool = Field(..., description="Explicit flag indicating whether real Nebius API was used")
    timestamp: str = Field(..., description="Timestamp of inference")


class ToolTraceItem(BaseModel):
    tool_name: str = Field(..., description="Allowlisted tool name called")
    arguments: Dict[str, Any] = Field(..., description="Input parameters provided to tool")
    executed_at: str = Field(..., description="ISO timestamp of invocation")
    duration_ms: float = Field(..., description="Execution duration")
    status: str = Field("SUCCESS", description="SUCCESS or ERROR")
    records_returned: int = Field(0, description="Count of records bounded and returned")
    summary: str = Field(..., description="Short summary of returned facts")


class InvestigationReport(BaseModel):
    investigation_id: str
    alert_id: str
    status: InvestigationState = InvestigationState.COMPLETED
    title: str
    severity: str
    executive_summary: str
    timeline: List[TimelineEvent] = Field(default_factory=list)
    hypotheses: List[HypothesisItem] = Field(default_factory=list)
    key_findings: List[KeyFindingItem] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    uncertainty: List[str] = Field(default_factory=list, description="Identified data limitations, blind spots, or unknown factors")
    confidence: QualitativeConfidence
    recommendations: List[ResponseRecommendation] = Field(default_factory=list)
    model_metadata: ModelMetadata
    tool_execution_trace: List[ToolTraceItem] = Field(default_factory=list)
    created_at: str
    completed_at: str


class InvestigationRequest(BaseModel):
    alert_id: str = Field(..., description="Identifier of the alert to investigate")
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Optional execution tuning parameters (e.g. max_steps, prioritize_speed)",
    )


class InvestigationStartResponse(BaseModel):
    investigation_id: str
    alert_id: str
    status: InvestigationState = InvestigationState.QUEUED
    created_at: str
    message: str = "Investigation job successfully queued for execution"


class InvestigationStatusResponse(BaseModel):
    investigation_id: str
    alert_id: str
    status: InvestigationState
    current_step: Optional[str] = None
    title: Optional[str] = None
    severity: Optional[str] = None
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    report: Optional[InvestigationReport] = None
    tool_execution_trace: Optional[List[ToolTraceItem]] = None
    model_metadata: Optional[ModelMetadata] = None


class InvestigationListResponse(BaseModel):
    items: List[InvestigationStatusResponse]
    total: int
    skip: int
    limit: int
