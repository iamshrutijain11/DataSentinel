"""Tests for the Autonomous Investigation Agent, State Machine, and Hypothesis Testing."""

import pytest

from app.agents.investigator import InvestigationAgent
from app.agents.state_machine import InvestigationContext, InvestigationState
from app.persistence.database import init_db


@pytest.fixture(autouse=True)
def init_database():
    init_db()


def test_state_machine_valid_transitions():
    ctx = InvestigationContext(investigation_id="inv-test-1", alert_id="alert-101")
    assert ctx.current_state == InvestigationState.QUEUED

    ctx.transition_to(InvestigationState.PLANNING, "Starting planning")
    assert ctx.current_state == InvestigationState.PLANNING

    ctx.transition_to(InvestigationState.EVIDENCE_COLLECTION, "Collecting evidence")
    assert ctx.current_state == InvestigationState.EVIDENCE_COLLECTION

    ctx.transition_to(InvestigationState.HYPOTHESIS_TESTING, "Evaluating hypotheses")
    assert ctx.current_state == InvestigationState.HYPOTHESIS_TESTING

    ctx.transition_to(InvestigationState.REPORT_GENERATION, "Synthesizing report")
    assert ctx.current_state == InvestigationState.REPORT_GENERATION

    ctx.transition_to(InvestigationState.COMPLETED, "Done")
    assert ctx.current_state == InvestigationState.COMPLETED
    assert ctx.completed_at is not None


def test_state_machine_illegal_transition():
    ctx = InvestigationContext(investigation_id="inv-test-2", alert_id="alert-101")
    assert ctx.current_state == InvestigationState.QUEUED

    # Skipping to COMPLETED directly should raise ValueError
    with pytest.raises(ValueError, match="Illegal state transition"):
        ctx.transition_to(InvestigationState.COMPLETED)


def test_agent_end_to_end_investigation_alert_101():
    ctx = InvestigationContext(
        investigation_id="inv-test-101",
        alert_id="alert-101",
        parameters={"max_steps": 5},
    )
    agent = InvestigationAgent()
    report = agent.run_investigation(ctx)

    assert report.investigation_id == "inv-test-101"
    assert report.alert_id == "alert-101"
    assert report.status == InvestigationState.COMPLETED
    assert "Suspicious High-Volume" in report.title

    # Must contain at least two competing hypotheses
    assert len(report.hypotheses) >= 2
    hypothesis_statuses = [h.status for h in report.hypotheses]
    assert any(s in ("SUPPORTED", "REFUTED") for s in hypothesis_statuses)

    # Must contain timeline events with timestamps and sources
    assert len(report.timeline) >= 2
    for event in report.timeline:
        assert event.timestamp != ""
        assert event.source != ""
        assert event.evidence_ref != ""

    # Must contain key findings with citations
    assert len(report.key_findings) >= 1
    for finding in report.key_findings:
        assert len(finding.evidence_ids) >= 1
        assert len(finding.timestamps) >= 1

    # Must contain safe recommendations with human authorization requirements
    assert len(report.recommendations) >= 1
    for rec in report.recommendations:
        assert rec.category in ("INVESTIGATE", "VALIDATE", "ISOLATE_WITH_APPROVAL", "ESCALATE")

    # Confidence must be qualitative
    assert report.confidence.type == "heuristic_qualitative"
    assert report.confidence.level in ("LOW", "MEDIUM", "HIGH")
