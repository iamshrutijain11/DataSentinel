"""Tests for Data Engine Adapter contract compliance and plug-and-play replacement."""

from typing import Any, Dict, List, Optional
from app.integrations.data_engine_adapter import (
    DataEngineAdapterInterface,
    MockDataEngineAdapter,
    get_data_engine_adapter,
    set_data_engine_adapter,
)


class CustomPySparkEngineStub(DataEngineAdapterInterface):
    """Stub demonstrating how Person 1's PySpark data engine plugs into the adapter."""

    def get_alert_details(self, alert_id: str) -> Optional[Dict[str, Any]]:
        return {"id": alert_id, "source": "pyspark_engine_v1", "status": "OPEN"}

    def get_alert_evidence(self, alert_id: str) -> List[Dict[str, Any]]:
        return [{"evidence_id": f"EV-PYSPARK-{alert_id}", "timestamp": "2026-10-28T00:00:00Z"}]

    def query_related_events(self, alert_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return []

    def get_host_activity(self, identifier: str, time_range: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return []

    def get_traffic_statistics(self, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {"engine": "pyspark_streaming", "peak": 1000}

    def get_related_alerts(self, alert_id: str) -> List[Dict[str, Any]]:
        return []

    def get_dataset_metadata(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        return {"id": dataset_id, "type": "pyspark_delta"}


def test_mock_adapter_implements_interface():
    adapter = MockDataEngineAdapter()
    assert isinstance(adapter, DataEngineAdapterInterface)

    details = adapter.get_alert_details("alert-101")
    assert details is not None
    assert details["id"] == "alert-101"

    evidence = adapter.get_alert_evidence("alert-101")
    assert isinstance(evidence, list)
    assert len(evidence) >= 3


def test_adapter_hot_swapping():
    # Verify default is MockDataEngineAdapter
    default_adapter = get_data_engine_adapter()
    assert isinstance(default_adapter, MockDataEngineAdapter)

    # Swap with Person 1's PySpark engine adapter
    custom_stub = CustomPySparkEngineStub()
    set_data_engine_adapter(custom_stub)

    current_adapter = get_data_engine_adapter()
    assert isinstance(current_adapter, CustomPySparkEngineStub)
    details = current_adapter.get_alert_details("alert-999")
    assert details["source"] == "pyspark_engine_v1"

    # Restore default mock adapter
    set_data_engine_adapter(MockDataEngineAdapter())
    assert isinstance(get_data_engine_adapter(), MockDataEngineAdapter)
