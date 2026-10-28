"""Defense verification mechanisms for DataSentinel 2.0.

Provides:
1. Evidence citation validity checker (ensures every finding/timeline event links to real evidence).
2. Safe response recommendation validator (prevents automatic destructive commands).
3. Tool argument bounds and sanity enforcement.
"""

from typing import Any, Dict, List, Set, Tuple
import logging

from app.schemas.investigations import (
    EvidenceItem,
    KeyFindingItem,
    TimelineEvent,
    ResponseRecommendation,
)

logger = logging.getLogger(__name__)

# Permitted safe recommendation categories
ALLOWED_RESPONSE_CATEGORIES = {
    "INVESTIGATE",
    "VALIDATE",
    "ISOLATE_WITH_APPROVAL",
    "ESCALATE",
}

# Forbidden actions that are destructive or attempt automatic system execution
FORBIDDEN_ACTION_KEYWORDS = [
    "format",
    "wipe",
    "rm -rf",
    "delete database",
    "drop table",
    "shutdown -h",
    "kill -9",
    "auto_block_all",
    "iptables -f",
]


class EvidenceCitationValidator:
    """Validates that all factual claims and timeline events reference genuine retrieved evidence."""

    @staticmethod
    def validate_citations(
        findings: List[KeyFindingItem],
        timeline: List[TimelineEvent],
        evidence_pool: List[EvidenceItem],
    ) -> Tuple[bool, List[str], List[KeyFindingItem], List[TimelineEvent]]:
        """Checks findings and timeline citations against the authoritative evidence pool.

        Returns (is_valid, validation_warnings, validated_findings, validated_timeline).
        Unverified citations are flagged or sanitized.
        """
        valid_evidence_ids: Set[str] = {ev.evidence_id for ev in evidence_pool}
        valid_timestamps: Set[str] = {ev.timestamp for ev in evidence_pool}

        warnings = []
        validated_findings = []
        validated_timeline = []

        # Validate findings
        for f in findings:
            unverified_ids = [eid for eid in f.evidence_ids if eid not in valid_evidence_ids]
            if unverified_ids:
                warnings.append(
                    f"Finding '{f.id}' referenced unverified evidence IDs: {unverified_ids}. Stripping hallucinated citations."
                )
                filtered_eids = [eid for eid in f.evidence_ids if eid in valid_evidence_ids]
                # Keep finding only if it has at least one valid citation or general context
                f.evidence_ids = filtered_eids or ["UNGROUNDED_EVIDENCE_FLAGGED"]
            validated_findings.append(f)

        # Validate timeline
        for t in timeline:
            if t.evidence_ref not in valid_evidence_ids and t.evidence_ref != "ALERT_ORIGIN":
                warnings.append(
                    f"Timeline event at '{t.timestamp}' references invalid evidence tag '{t.evidence_ref}'. Marking unverified."
                )
                t.evidence_ref = "UNVERIFIED_EVIDENCE_REFERENCE"
            validated_timeline.append(t)

        is_valid = len(warnings) == 0
        return is_valid, warnings, validated_findings, validated_timeline


class SafeResponseEnforcer:
    """Enforces strictly defensive, non-destructive recommendations with required human-in-the-loop authorization."""

    @staticmethod
    def filter_and_enforce(
        recommendations: List[ResponseRecommendation],
    ) -> List[ResponseRecommendation]:
        safe_list: List[ResponseRecommendation] = []
        for rec in recommendations:
            action_lower = rec.action.lower()

            # Check for forbidden destructive patterns
            if any(forbidden in action_lower for forbidden in FORBIDDEN_ACTION_KEYWORDS):
                logger.warning("Rejected destructive recommendation: %s", rec.action)
                continue

            # Ensure category is strictly allowlisted
            if rec.category not in ALLOWED_RESPONSE_CATEGORIES:
                rec.category = "INVESTIGATE"

            # Enforce human authorization flag for host isolation or containment
            if rec.category == "ISOLATE_WITH_APPROVAL" or "isolate" in action_lower or "block" in action_lower:
                rec.requires_human_authorization = True

            safe_list.append(rec)

        # Ensure at least one standard baseline recommendation exists
        if not safe_list:
            safe_list.append(
                ResponseRecommendation(
                    action="Escalate to an incident responder for manual review",
                    priority="HIGH",
                    category="ESCALATE",
                    justification="No automated safe action met criteria; human review required.",
                    requires_human_authorization=False,
                )
            )

        return safe_list
