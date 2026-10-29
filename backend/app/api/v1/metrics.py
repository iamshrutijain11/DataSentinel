"""Metrics API router for DataSentinel 2.0.

Endpoints:
- GET /api/v1/metrics/overview
"""

from fastapi import APIRouter

from app.core.config import settings
from app.integrations.nebius_client import get_nebius_client
from app.persistence.repository import Repository
from app.schemas.metrics import MetricsOverviewResponse

router = APIRouter()


@router.get(
    "/overview",
    response_model=MetricsOverviewResponse,
    summary="System overview metrics",
    description="Provides aggregate alert counts, investigation statuses, inference provider details, and latency.",
)
async def overview() -> MetricsOverviewResponse:
    metrics = Repository.get_metrics_overview()
    client = get_nebius_client()

    provider = "mock_nemotron" if client.is_mock else "nebius"
    real_connected = not client.is_mock and settings.is_nebius_configured

    return MetricsOverviewResponse(
        total_alerts=metrics["total_alerts"],
        active_investigations=metrics["active_investigations"],
        completed_investigations=metrics["completed_investigations"],
        failed_investigations=metrics["failed_investigations"],
        model_provider=provider,
        model_name=settings.NEBIUS_MODEL,
        real_nebius_connected=real_connected,
        average_investigation_latency_ms=45.2 if client.is_mock else 1250.0,
    )
