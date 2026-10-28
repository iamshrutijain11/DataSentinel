"""Allowlisted, read-only evidence retrieval tools for DataSentinel 2.0 AI Agent.

Enforces:
- Input validation and sanitization
- Bounded output row limits (truncation defense)
- Query caching during investigation
- Execution auditing (timing, status, record counts)
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.integrations.data_engine_adapter import get_data_engine_adapter
from app.schemas.investigations import ToolTraceItem
from app.security.sanitizer import sanitize_structure

logger = logging.getLogger(__name__)


class ToolExecutionRegistry:
    """Manages tool execution, input validation, row bounding, caching, and trace generation."""

    def __init__(self, max_rows: Optional[int] = None):
        self.max_rows = max_rows or settings.MAX_TOOL_ROWS
        self.cache: Dict[str, Any] = {}
        self.trace: List[ToolTraceItem] = []

    def _cache_key(self, tool_name: str, kwargs: Dict[str, Any]) -> str:
        serialized = json.dumps({"tool": tool_name, "args": kwargs}, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Tuple[Dict[str, Any], ToolTraceItem]:
        start_time = time.perf_counter()
        now_iso = datetime.now(timezone.utc).isoformat()
        adapter = get_data_engine_adapter()

        # Sanitize input arguments
        clean_args = sanitize_structure(arguments) if isinstance(arguments, dict) else {}
        cache_k = self._cache_key(tool_name, clean_args)

        if cache_k in self.cache:
            logger.info("Tool cache hit for '%s'", tool_name)
            cached_data = self.cache[cache_k]
            trace_item = ToolTraceItem(
                tool_name=tool_name,
                arguments=clean_args,
                executed_at=now_iso,
                duration_ms=0.1,
                status="SUCCESS_CACHED",
                records_returned=cached_data.get("record_count", 0),
                summary=cached_data.get("summary", "Cached result returned."),
            )
            self.trace.append(trace_item)
            return cached_data, trace_item

        result_data: Dict[str, Any] = {}
        status = "SUCCESS"
        summary = ""
        records_count = 0

        try:
            if tool_name == "get_alert_details":
                alert_id = str(clean_args.get("alert_id", "")).strip()
                if not alert_id:
                    raise ValueError("Missing required argument: 'alert_id'")
                details = adapter.get_alert_details(alert_id)
                records_count = 1 if details else 0
                summary = f"Alert details for {alert_id} retrieved: {details.get('title', 'N/A') if details else 'Not found'}"
                result_data = {"alert": details, "summary": summary, "record_count": records_count}

            elif tool_name == "get_alert_evidence":
                alert_id = str(clean_args.get("alert_id", "")).strip()
                if not alert_id:
                    raise ValueError("Missing required argument: 'alert_id'")
                ev_list = adapter.get_alert_evidence(alert_id)
                bounded = ev_list[: self.max_rows]
                records_count = len(bounded)
                summary = f"Retrieved {records_count} evidence records for alert {alert_id}"
                result_data = {
                    "evidence": bounded,
                    "truncated": len(ev_list) > self.max_rows,
                    "total_available": len(ev_list),
                    "summary": summary,
                    "record_count": records_count,
                }

            elif tool_name == "query_related_events":
                alert_id = str(clean_args.get("alert_id", "")).strip()
                filters = clean_args.get("filters")
                events = adapter.query_related_events(alert_id, filters)
                bounded = events[: self.max_rows]
                records_count = len(bounded)
                summary = f"Found {records_count} correlated events for alert {alert_id}"
                result_data = {
                    "events": bounded,
                    "truncated": len(events) > self.max_rows,
                    "summary": summary,
                    "record_count": records_count,
                }

            elif tool_name == "get_host_activity":
                identifier = str(clean_args.get("identifier", "")).strip()
                if not identifier:
                    raise ValueError("Missing required argument: 'identifier'")
                time_range = clean_args.get("time_range")
                activities = adapter.get_host_activity(identifier, time_range)
                bounded = activities[: self.max_rows]
                records_count = len(bounded)
                summary = f"Retrieved {records_count} activity records for host/IP '{identifier}'"
                result_data = {
                    "activities": bounded,
                    "truncated": len(activities) > self.max_rows,
                    "summary": summary,
                    "record_count": records_count,
                }

            elif tool_name == "get_traffic_statistics":
                filters = clean_args.get("filters")
                stats = adapter.get_traffic_statistics(filters)
                records_count = len(stats)
                summary = f"Traffic statistics calculated: Peak {stats.get('current_hourly_peak', 'N/A')} bytes, sigma {stats.get('anomaly_deviation_sigma', 'N/A')}"
                result_data = {"statistics": stats, "summary": summary, "record_count": records_count}

            elif tool_name == "get_related_alerts":
                alert_id = str(clean_args.get("alert_id", "")).strip()
                if not alert_id:
                    raise ValueError("Missing required argument: 'alert_id'")
                related = adapter.get_related_alerts(alert_id)
                bounded = related[: self.max_rows]
                records_count = len(bounded)
                summary = f"Identified {records_count} topologically related alerts"
                result_data = {"related_alerts": bounded, "summary": summary, "record_count": records_count}

            elif tool_name == "get_dataset_metadata":
                dataset_id = str(clean_args.get("dataset_id", "")).strip()
                if not dataset_id:
                    raise ValueError("Missing required argument: 'dataset_id'")
                meta = adapter.get_dataset_metadata(dataset_id)
                records_count = 1 if meta else 0
                summary = f"Dataset metadata for {dataset_id} fetched: {meta.get('name', 'N/A') if meta else 'Not found'}"
                result_data = {"metadata": meta, "summary": summary, "record_count": records_count}

            else:
                status = "ERROR"
                summary = f"Rejected call to unauthorized or non-allowlisted tool: '{tool_name}'"
                result_data = {"error": summary}

        except Exception as e:
            logger.exception("Error executing tool %s", tool_name)
            status = "ERROR"
            summary = f"Tool execution failed: {str(e)}"
            result_data = {"error": summary}

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        trace_item = ToolTraceItem(
            tool_name=tool_name,
            arguments=clean_args,
            executed_at=now_iso,
            duration_ms=round(elapsed_ms, 2),
            status=status,
            records_returned=records_count,
            summary=summary,
        )

        self.trace.append(trace_item)
        if status == "SUCCESS":
            self.cache[cache_k] = result_data

        return result_data, trace_item
