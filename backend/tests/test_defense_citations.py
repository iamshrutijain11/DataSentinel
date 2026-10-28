"""Tests for Evidence Citation Validity and Safe Response Recommendation Enforcement."""

from app.schemas.investigations import (
    EvidenceItem,
    KeyFindingItem,
    ResponseRecommendation,
    TimelineEvent,
)
from app.security.defense import EvidenceCitationValidator, SafeResponseEnforcer


def test_evidence_citation_validator_valid():
    evidence_pool = [
        EvidenceItem(
            evidence_id="EV-NET-01",
            timestamp="2026-10-27T22:00:00Z",
            data_source="zeek",
            summary="TCP connection",
        ),
        EvidenceItem(
            evidence_id="EV-AUTH-02",
            timestamp="2026-10-27T22:05:00Z",
            data_source="auditd",
            summary="User login",
        ),
    ]

    findings = [
        KeyFindingItem(
            id="F1",
            finding="Outbound TCP session observed",
            evidence_ids=["EV-NET-01"],
            timestamps=["2026-10-27T22:00:00Z"],
            significance="High egress",
        )
    ]

    timeline = [
        TimelineEvent(
            timestamp="2026-10-27T22:00:00Z",
            event_id="zeek-1",
            description="TCP session open",
            source="zeek",
            evidence_ref="EV-NET-01",
        )
    ]

    is_valid, warnings, v_findings, v_timeline = (
        EvidenceCitationValidator.validate_citations(findings, timeline, evidence_pool)
    )
    assert is_valid is True
    assert len(warnings) == 0
    assert v_findings[0].evidence_ids == ["EV-NET-01"]


def test_evidence_citation_validator_catches_hallucinations():
    evidence_pool = [
        EvidenceItem(
            evidence_id="EV-REAL-01",
            timestamp="2026-10-27T22:00:00Z",
            data_source="zeek",
            summary="Real telemetry",
        )
    ]

    # Finding hallucinates EV-FAKE-999
    findings = [
        KeyFindingItem(
            id="F1",
            finding="Attacker exfiltrated password hashes",
            evidence_ids=["EV-REAL-01", "EV-FAKE-999"],
            timestamps=["2026-10-27T22:00:00Z"],
            significance="Suspicious",
        )
    ]

    timeline = [
        TimelineEvent(
            timestamp="2026-10-27T22:00:00Z",
            event_id="fake-evt",
            description="Fabricated timeline event",
            source="zeek",
            evidence_ref="EV-NONEXISTENT",
        )
    ]

    is_valid, warnings, v_findings, v_timeline = (
        EvidenceCitationValidator.validate_citations(findings, timeline, evidence_pool)
    )
    assert is_valid is False
    assert len(warnings) == 2
    # Unverified citation must be stripped from finding
    assert "EV-FAKE-999" not in v_findings[0].evidence_ids
    assert "EV-REAL-01" in v_findings[0].evidence_ids
    assert v_timeline[0].evidence_ref == "UNVERIFIED_EVIDENCE_REFERENCE"


def test_safe_response_enforcer_filters_destructive_actions():
    recommendations = [
        ResponseRecommendation(
            action="Format disk on infected endpoint immediately",
            priority="HIGH",
            category="ISOLATE_WITH_APPROVAL",
            justification="Kill malware",
            requires_human_authorization=False,
        ),
        ResponseRecommendation(
            action="Run rm -rf /var/log on target server",
            priority="IMMEDIATE",
            category="INVESTIGATE",
            justification="Clean up",
            requires_human_authorization=False,
        ),
        ResponseRecommendation(
            action="Review host activity and active network connections",
            priority="HIGH",
            category="INVESTIGATE",
            justification="Gather context",
            requires_human_authorization=False,
        ),
        ResponseRecommendation(
            action="Isolate host from subnet after human authorization",
            priority="MEDIUM",
            category="ISOLATE_WITH_APPROVAL",
            justification="Prevent potential lateral spread",
            requires_human_authorization=False,  # Should be forced to True
        ),
    ]

    safe_recs = SafeResponseEnforcer.filter_and_enforce(recommendations)
    # Destructive recommendations (format disk, rm -rf) must be excluded
    assert len(safe_recs) == 2
    actions = [r.action for r in safe_recs]
    assert not any("format" in a.lower() for a in actions)
    assert not any("rm -rf" in a.lower() for a in actions)

    # Isolation must require human authorization
    isolation_rec = next(r for r in safe_recs if "isolate" in r.action.lower())
    assert isolation_rec.requires_human_authorization is True
