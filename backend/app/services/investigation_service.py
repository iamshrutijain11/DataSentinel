"""High-level service interface for investigations."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from app.persistence.repository import Repository
from app.services.job_runner import get_job_runner


def start_investigation_job(
    investigation_id: Optional[str],
    alert_id: str,
    parameters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Validates the alert, records the initial investigation state in DB, and submits it to the background runner."""
    inv_id = investigation_id or str(uuid4())
    params = parameters or {}

    # Verify alert exists
    alert = Repository.get_alert(alert_id)
    if not alert:
        raise ValueError(f"Alert '{alert_id}' does not exist.")

    title = alert.get("title", f"Investigation for {alert_id}")
    severity = alert.get("severity", "medium")

    # Persist in SQLite
    record = Repository.create_investigation(
        inv_id=inv_id,
        alert_id=alert_id,
        title=title,
        severity=severity,
        parameters=params,
    )

    # Submit to worker pool
    runner = get_job_runner()
    runner.submit_investigation(inv_id, alert_id, params)

    return record


def get_investigation_status(investigation_id: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """Retrieves current execution state and full structured report if completed."""
    record = Repository.get_investigation(investigation_id)
    if not record:
        return None, None
    status = record.get("status")
    return status, record


def list_investigations(skip: int = 0, limit: int = 50) -> Tuple[List[Dict[str, Any]], int]:
    return Repository.list_investigations(skip=skip, limit=limit)
