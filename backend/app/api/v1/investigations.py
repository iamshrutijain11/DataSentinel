"""Investigations API router for DataSentinel 2.0.

Endpoints:
- POST /api/v1/investigations (Trigger async AI investigation)
- GET  /api/v1/investigations/{investigation_id} (Poll status and full report)
- GET  /api/v1/investigations (List all investigations)
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.investigations import (
    InvestigationListResponse,
    InvestigationRequest,
    InvestigationStartResponse,
    InvestigationStatusResponse,
)
from app.services.investigation_service import (
    get_investigation_status,
    list_investigations,
    start_investigation_job,
)

router = APIRouter()


@router.post(
    "",
    response_model=InvestigationStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start an autonomous AI investigation",
    description="Submits an alert to the NVIDIA Nemotron agentic state machine for multi-hypothesis investigation.",
)
async def create_investigation(request: InvestigationRequest) -> InvestigationStartResponse:
    inv_id = str(uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        start_investigation_job(
            investigation_id=inv_id,
            alert_id=request.alert_id,
            parameters=request.parameters or {},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue investigation: {str(e)}",
        )

    return InvestigationStartResponse(
        investigation_id=inv_id,
        alert_id=request.alert_id,
        status="QUEUED",
        created_at=now_iso,
        message="Investigation successfully queued. Poll /api/v1/investigations/{investigation_id} for progress.",
    )


@router.get(
    "/{investigation_id}",
    response_model=InvestigationStatusResponse,
    summary="Get investigation status and structured report",
    description="Polls current state (QUEUED, PLANNING, EVIDENCE_COLLECTION, HYPOTHESIS_TESTING, REPORT_GENERATION, COMPLETED).",
)
async def get_investigation(investigation_id: str) -> InvestigationStatusResponse:
    status_str, record = get_investigation_status(investigation_id)
    if not record or not status_str:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation with ID '{investigation_id}' was not found.",
        )

    return InvestigationStatusResponse(
        investigation_id=investigation_id,
        alert_id=record["alert_id"],
        status=record["status"],
        current_step=record.get("current_step"),
        title=record.get("title"),
        severity=record.get("severity"),
        created_at=record["created_at"],
        updated_at=record["updated_at"],
        completed_at=record.get("completed_at"),
        error_message=record.get("error_message"),
        report=record.get("report"),
        tool_execution_trace=record.get("tool_execution_trace"),
        model_metadata=record.get("model_metadata"),
    )


@router.get(
    "",
    response_model=InvestigationListResponse,
    summary="List investigations",
    description="Lists past and running investigation jobs with status and pagination.",
)
async def list_all_investigations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> InvestigationListResponse:
    records, total = list_investigations(skip=skip, limit=limit)
    items = []
    for r in records:
        items.append(
            InvestigationStatusResponse(
                investigation_id=r["id"],
                alert_id=r["alert_id"],
                status=r["status"],
                current_step=r.get("current_step"),
                title=r.get("title"),
                severity=r.get("severity"),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                completed_at=r.get("completed_at"),
                error_message=r.get("error_message"),
                report=r.get("report"),
                tool_execution_trace=r.get("tool_execution_trace"),
                model_metadata=r.get("model_metadata"),
            )
        )
    return InvestigationListResponse(items=items, total=total, skip=skip, limit=limit)
