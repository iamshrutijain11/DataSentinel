"""Integration tests for all DataSentinel 2.0 API v1 endpoints."""

import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.persistence.database import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data
    assert "database" in data
    assert "inference" in data
    assert data["database"]["connected"] is True


def test_metrics_overview(client):
    response = client.get("/api/v1/metrics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_alerts" in data
    assert data["total_alerts"] >= 3
    assert "active_investigations" in data
    assert "completed_investigations" in data
    assert "model_provider" in data
    assert "model_name" in data


def test_benchmarks_list(client):
    response = client.get("/api/v1/benchmarks")
    assert response.status_code == 200
    benchmarks = response.json()
    assert isinstance(benchmarks, list)
    assert len(benchmarks) >= 4
    first = benchmarks[0]
    assert "id" in first
    assert "name" in first
    assert "detection_target" in first


def test_alerts_list_and_filter(client):
    # Test default listing
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 3
    assert len(data["items"]) >= 3

    # Test filtering by severity
    high_resp = client.get("/api/v1/alerts?severity=high")
    assert high_resp.status_code == 200
    high_data = high_resp.json()
    for item in high_data["items"]:
        assert item["severity"] == "high"


def test_get_alert_details(client):
    # Valid alert
    response = client.get("/api/v1/alerts/alert-101")
    assert response.status_code == 200
    alert = response.json()
    assert alert["id"] == "alert-101"
    assert "Suspicious High-Volume" in alert["title"]
    assert alert["severity"] == "high"

    # Non-existent alert
    not_found = client.get("/api/v1/alerts/non-existent-alert-999")
    assert not_found.status_code == 404


def test_dataset_upload_and_get(client):
    sample_content = b"timestamp,src_ip,dst_ip,bytes\n2026-10-27T22:00:00Z,10.0.4.15,198.51.100.44,542000000\n"
    file = io.BytesIO(sample_content)
    upload_resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test_netflow.csv", file, "text/csv")},
    )
    assert upload_resp.status_code == 201
    upload_data = upload_resp.json()
    assert "dataset_id" in upload_data
    assert upload_data["detail"] == "uploaded"

    ds_id = upload_data["dataset_id"]
    get_resp = client.get(f"/api/v1/datasets/{ds_id}")
    assert get_resp.status_code == 200
    ds_data = get_resp.json()
    assert ds_data["id"] == ds_id
    assert ds_data["filename"] == "test_netflow.csv"


def test_investigation_lifecycle_api(client):
    # 1. Trigger investigation on alert-101
    post_resp = client.post(
        "/api/v1/investigations",
        json={"alert_id": "alert-101", "parameters": {"max_steps": 4}},
    )
    assert post_resp.status_code == 201
    start_data = post_resp.json()
    assert "investigation_id" in start_data
    assert start_data["status"] == "QUEUED"
    inv_id = start_data["investigation_id"]

    # 2. Poll investigation status
    import time
    max_wait = 15.0
    start_time = time.time()
    final_data = None

    while time.time() - start_time < max_wait:
        poll_resp = client.get(f"/api/v1/investigations/{inv_id}")
        assert poll_resp.status_code == 200
        data = poll_resp.json()
        if data["status"] in ("COMPLETED", "FAILED"):
            final_data = data
            break
        time.sleep(0.5)

    assert final_data is not None, "Investigation timed out in background runner"
    assert final_data["status"] == "COMPLETED"
    assert final_data["report"] is not None

    report = final_data["report"]
    assert report["investigation_id"] == inv_id
    assert report["alert_id"] == "alert-101"
    assert len(report["hypotheses"]) >= 2
    assert len(report["key_findings"]) >= 1
    assert len(report["timeline"]) >= 1
    assert len(report["recommendations"]) >= 1
    assert "confidence" in report
    assert "model_metadata" in report
