"""Tests for allowlisted evidence tools, bounds enforcement, caching, and audit traces."""

import pytest
from app.tools.evidence_tools import ToolExecutionRegistry
from app.persistence.database import init_db


@pytest.fixture(autouse=True)
def init_database():
    init_db()


def test_get_alert_details_tool():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("get_alert_details", {"alert_id": "alert-101"})
    assert trace.status == "SUCCESS"
    assert trace.tool_name == "get_alert_details"
    assert res["alert"]["id"] == "alert-101"
    assert "Suspicious High-Volume" in res["alert"]["title"]


def test_get_alert_evidence_tool():
    reg = ToolExecutionRegistry(max_rows=10)
    res, trace = reg.execute_tool("get_alert_evidence", {"alert_id": "alert-101"})
    assert trace.status == "SUCCESS"
    assert "evidence" in res
    assert len(res["evidence"]) >= 3
    first_ev = res["evidence"][0]
    assert "evidence_id" in first_ev
    assert "timestamp" in first_ev
    assert "data_source" in first_ev


def test_query_related_events_tool():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("query_related_events", {"alert_id": "alert-101"})
    assert trace.status == "SUCCESS"
    assert "events" in res
    assert len(res["events"]) >= 1


def test_get_host_activity_tool():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("get_host_activity", {"identifier": "10.0.4.15"})
    assert trace.status == "SUCCESS"
    assert "activities" in res
    assert len(res["activities"]) >= 1


def test_get_traffic_statistics_tool():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("get_traffic_statistics", {})
    assert trace.status == "SUCCESS"
    stats = res["statistics"]
    assert "total_bytes_out" in stats
    assert "current_hourly_peak" in stats
    assert stats["anomaly_deviation_sigma"] > 0


def test_get_related_alerts_tool():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("get_related_alerts", {"alert_id": "alert-101"})
    assert trace.status == "SUCCESS"
    assert "related_alerts" in res


def test_get_dataset_metadata_tool():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("get_dataset_metadata", {"dataset_id": "dataset-netflow-2026"})
    assert trace.status == "SUCCESS"
    assert "metadata" in res


def test_unauthorized_tool_execution():
    reg = ToolExecutionRegistry()
    res, trace = reg.execute_tool("execute_bash_command", {"cmd": "whoami"})
    assert trace.status == "ERROR"
    assert "Rejected call to unauthorized" in res["error"]


def test_tool_query_caching():
    reg = ToolExecutionRegistry()
    res1, trace1 = reg.execute_tool("get_traffic_statistics", {})
    assert trace1.status == "SUCCESS"

    # Second call should hit the cache
    res2, trace2 = reg.execute_tool("get_traffic_statistics", {})
    assert trace2.status == "SUCCESS_CACHED"
    assert trace2.duration_ms < 1.0


def test_tool_row_bounding():
    # Enforce maximum 2 rows
    reg = ToolExecutionRegistry(max_rows=2)
    res, trace = reg.execute_tool("get_alert_evidence", {"alert_id": "alert-101"})
    assert trace.status == "SUCCESS"
    assert len(res["evidence"]) <= 2
    assert res["record_count"] <= 2
