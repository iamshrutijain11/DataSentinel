"""Investigation State Machine for DataSentinel 2.0.

Implements the bounded state progression:
QUEUED -> PLANNING -> EVIDENCE_COLLECTION -> HYPOTHESIS_TESTING -> REPORT_GENERATION -> COMPLETED (or FAILED).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

from app.schemas.investigations import (
    InvestigationState,
    EvidenceItem,
    HypothesisItem,
    KeyFindingItem,
    TimelineEvent,
    InvestigationReport,
)

logger = logging.getLogger(__name__)

# Valid transitions map
VALID_TRANSITIONS = {
    InvestigationState.QUEUED: {InvestigationState.PLANNING, InvestigationState.FAILED},
    InvestigationState.PLANNING: {InvestigationState.EVIDENCE_COLLECTION, InvestigationState.FAILED},
    InvestigationState.EVIDENCE_COLLECTION: {InvestigationState.HYPOTHESIS_TESTING, InvestigationState.FAILED},
    InvestigationState.HYPOTHESIS_TESTING: {InvestigationState.REPORT_GENERATION, InvestigationState.FAILED},
    InvestigationState.REPORT_GENERATION: {InvestigationState.COMPLETED, InvestigationState.FAILED},
    InvestigationState.COMPLETED: set(),
    InvestigationState.FAILED: set(),
}


class InvestigationContext:
    """Encapsulates the evolving analytical state of an alert investigation."""

    def __init__(self, investigation_id: str, alert_id: str, parameters: Optional[Dict[str, Any]] = None):
        self.investigation_id = investigation_id
        self.alert_id = alert_id
        self.parameters = parameters or {}

        self.current_state = InvestigationState.QUEUED
        self.state_history: List[Dict[str, str]] = []

        self.alert_data: Dict[str, Any] = {}
        self.hypotheses: List[Dict[str, Any]] = []
        self.evidence_pool: Dict[str, EvidenceItem] = {}
        self.final_report: Optional[InvestigationReport] = None
        self.error_message: Optional[str] = None

        self.step_counter = 0
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.completed_at: Optional[str] = None

        self._record_state_change(self.current_state, "Investigation registered in queue")

    def transition_to(self, new_state: InvestigationState, reason: str = "") -> None:
        """Transitions to the next state if valid according to the state machine definition."""
        allowed = VALID_TRANSITIONS.get(self.current_state, set())
        if new_state not in allowed:
            err = f"Illegal state transition from {self.current_state} to {new_state}"
            logger.error(err)
            raise ValueError(err)

        self.current_state = new_state
        self._record_state_change(new_state, reason)

        if new_state in (InvestigationState.COMPLETED, InvestigationState.FAILED):
            self.completed_at = datetime.now(timezone.utc).isoformat()

    def _record_state_change(self, state: InvestigationState, reason: str) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        self.state_history.append({
            "state": state.value,
            "timestamp": now_iso,
            "reason": reason,
        })
        logger.info("[Investigation %s] Entered state: %s (%s)", self.investigation_id, state.value, reason)

    def add_evidence(self, item: Dict[str, Any]) -> None:
        """Adds a standardized evidence record to the pool."""
        ev_id = item.get("evidence_id") or f"EV-{len(self.evidence_pool)+1:02d}"
        if ev_id not in self.evidence_pool:
            self.evidence_pool[ev_id] = EvidenceItem(
                evidence_id=ev_id,
                event_id=item.get("event_id"),
                timestamp=item.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                data_source=item.get("data_source", "unknown"),
                summary=item.get("summary", "Sensor observation"),
                raw_details=item.get("raw_details", {}),
            )

    def get_evidence_list(self) -> List[EvidenceItem]:
        return list(self.evidence_pool.values())
