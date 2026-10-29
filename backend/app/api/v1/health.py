"""Health check API router for DataSentinel 2.0.

Endpoints:
- GET /api/v1/health
"""

from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter

from app.core.config import settings
from app.integrations.nebius_client import get_nebius_client
from app.persistence.database import get_db_connection

router = APIRouter()


@router.get(
    "",
    summary="Health and Readiness Check",
    description="Reports the operational status of the API, persistence database, and Nebius Token Factory connection.",
)
async def health_check() -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()

    # Test database connectivity
    db_ok = False
    try:
        with get_db_connection() as conn:
            conn.execute("SELECT 1;").fetchone()
            db_ok = True
    except Exception:
        db_ok = False

    # Check Nebius status
    nebius_client = get_nebius_client()
    nebius_info = {
        "configured": settings.is_nebius_configured,
        "mode": "mock_nemotron" if nebius_client.is_mock else "nebius",
        "model": settings.NEBIUS_MODEL,
        "base_url": settings.NEBIUS_BASE_URL,
    }

    return {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": now_iso,
        "version": settings.APP_VERSION,
        "database": {"connected": db_ok, "type": "sqlite_wal"},
        "inference": nebius_info,
    }
