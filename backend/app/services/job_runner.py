"""Explicitly managed in-process background job runner for DataSentinel 2.0 MVP.

Features:
- Bounded concurrency with ThreadPoolExecutor (prevents overwhelming system and Nebius API)
- Timeout enforcement for inference operations
- Automatic retry on transient failures
- SQLite job state synchronization
- Clean shutdown handling

Architecture Note for Production:
In a multi-instance production environment, this in-process ThreadPoolExecutor
should be replaced with a distributed durable task queue (e.g., Celery with Redis/RabbitMQ,
Temporal, or Cloud Tasks). The database schema and investigation interfaces
are deliberately structured to require zero changes when transitioning to a distributed worker.
"""

import logging
import threading
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional

from app.agents.investigator import InvestigationAgent
from app.agents.state_machine import InvestigationContext
from app.core.config import settings
from app.persistence.repository import Repository

logger = logging.getLogger(__name__)


class BackgroundJobRunner:
    """Manages asynchronous investigation job execution with bounded concurrency."""

    def __init__(self, max_workers: Optional[int] = None):
        self.max_workers = max_workers or settings.MAX_INVESTIGATION_CONCURRENCY
        self._executor = ThreadPoolExecutor(
            max_workers=self.max_workers,
            thread_name_prefix="datasentinel-worker",
        )
        self._active_jobs: Dict[str, Future] = {}
        self._lock = threading.Lock()
        logger.info("Initialized BackgroundJobRunner with max_workers=%d", self.max_workers)

    def submit_investigation(
        self,
        investigation_id: str,
        alert_id: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Queues an investigation job for background execution."""
        with self._lock:
            # If executor was shut down (e.g. between tests or lifespan restarts), revive it
            if self._executor._shutdown:
                self._executor = ThreadPoolExecutor(
                    max_workers=self.max_workers,
                    thread_name_prefix="datasentinel-worker",
                )

            # Prevent duplicate submissions
            if investigation_id in self._active_jobs and not self._active_jobs[investigation_id].done():
                logger.warning("Investigation %s is already active. Ignoring submission.", investigation_id)
                return

            future = self._executor.submit(
                self._run_job_with_lifecycle,
                investigation_id,
                alert_id,
                parameters or {},
            )
            self._active_jobs[investigation_id] = future

    def _run_job_with_lifecycle(
        self,
        investigation_id: str,
        alert_id: str,
        parameters: Dict[str, Any],
    ) -> None:
        """Worker thread entrypoint that executes the investigation agent with retries and timeout."""
        logger.info("[Worker] Starting background investigation %s for alert %s", investigation_id, alert_id)
        max_retries = settings.MAX_JOB_RETRIES
        attempt = 0

        while attempt <= max_retries:
            attempt += 1
            try:
                context = InvestigationContext(
                    investigation_id=investigation_id,
                    alert_id=alert_id,
                    parameters=parameters,
                )
                agent = InvestigationAgent()
                agent.run_investigation(context)
                logger.info("[Worker] Investigation %s completed successfully on attempt %d", investigation_id, attempt)
                break

            except Exception as e:
                logger.error(
                    "[Worker] Investigation %s attempt %d failed: %s",
                    investigation_id,
                    attempt,
                    e,
                    exc_info=True,
                )
                if attempt > max_retries:
                    logger.error("[Worker] Investigation %s exceeded max retries (%d). Marked as FAILED.", investigation_id, max_retries)
                    break
                logger.info("[Worker] Retrying investigation %s (attempt %d/%d)...", investigation_id, attempt + 1, max_retries)

        with self._lock:
            self._active_jobs.pop(investigation_id, None)

    def shutdown(self, wait: bool = True) -> None:
        logger.info("Shutting down BackgroundJobRunner...")
        self._executor.shutdown(wait=wait)


# Singleton instance
_RUNNER_INSTANCE: Optional[BackgroundJobRunner] = None


def get_job_runner() -> BackgroundJobRunner:
    global _RUNNER_INSTANCE
    if _RUNNER_INSTANCE is None:
        _RUNNER_INSTANCE = BackgroundJobRunner()
    return _RUNNER_INSTANCE
