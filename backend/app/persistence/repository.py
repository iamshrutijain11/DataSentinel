"""Repository operations for DataSentinel 2.0.

Provides strongly typed CRUD queries against the SQLite store.
"""

import json
from datetime import datetime, timezone
from typing import Any, Optional

from app.persistence.database import get_db_connection


class Repository:
    # -----------------------------------------------------------------------
    # Alerts
    # -----------------------------------------------------------------------
    @staticmethod
    def get_alert(alert_id: str) -> Optional[dict[str, Any]]:
        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM alerts WHERE id = ?;", (alert_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("metadata_json"):
                try:
                    res["metadata"] = json.loads(res["metadata_json"])
                except Exception:
                    res["metadata"] = {}
            return res

    @staticmethod
    def list_alerts(
        skip: int = 0,
        limit: int = 50,
        severity: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[list[dict[str, Any]], int]:
        query = "SELECT * FROM alerts WHERE 1=1"
        count_query = "SELECT COUNT(*) as cnt FROM alerts WHERE 1=1"
        params: list[Any] = []

        if severity:
            query += " AND severity = ?"
            count_query += " AND severity = ?"
            params.append(severity.lower())

        if status:
            query += " AND status = ?"
            count_query += " AND status = ?"
            params.append(status.upper())

        with get_db_connection() as conn:
            total_count = conn.execute(count_query, params).fetchone()["cnt"]

            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?;"
            rows = conn.execute(query, params + [limit, skip]).fetchall()

            alerts = []
            for r in rows:
                item = dict(r)
                if item.get("metadata_json"):
                    try:
                        item["metadata"] = json.loads(item["metadata_json"])
                    except Exception:
                        item["metadata"] = {}
                alerts.append(item)

            return alerts, total_count

    @staticmethod
    def create_alert(data: dict[str, Any]) -> dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        metadata_str = json.dumps(data.get("metadata") or {})
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO alerts (
                    id, title, severity, status, description, source, dataset_id,
                    host_identifier, anomaly_score, timestamp, evidence_count, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    data["id"],
                    data["title"],
                    data.get("severity", "medium").lower(),
                    data.get("status", "OPEN").upper(),
                    data["description"],
                    data.get("source", "system"),
                    data.get("dataset_id"),
                    data.get("host_identifier"),
                    float(data.get("anomaly_score", 0.0)),
                    data.get("timestamp", now_iso),
                    int(data.get("evidence_count", 0)),
                    metadata_str,
                    now_iso,
                ),
            )
        return Repository.get_alert(data["id"]) or data

    # -----------------------------------------------------------------------
    # Datasets
    # -----------------------------------------------------------------------
    @staticmethod
    def create_dataset(
        dataset_id: str,
        filename: str,
        path: str,
        size_bytes: int,
        record_count: int = 0,
        schema_info: Optional[str] = None,
    ) -> dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO datasets (id, filename, path, size_bytes, record_count, schema_info, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (dataset_id, filename, path, size_bytes, record_count, schema_info, now_iso),
            )
        return Repository.get_dataset(dataset_id) or {}

    @staticmethod
    def get_dataset(dataset_id: str) -> Optional[dict[str, Any]]:
        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM datasets WHERE id = ?;", (dataset_id,)).fetchone()
            return dict(row) if row else None

    @staticmethod
    def list_datasets(skip: int = 0, limit: int = 50) -> list[dict[str, Any]]:
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM datasets ORDER BY uploaded_at DESC LIMIT ? OFFSET ?;",
                (limit, skip),
            ).fetchall()
            return [dict(r) for r in rows]

    # -----------------------------------------------------------------------
    # Investigations
    # -----------------------------------------------------------------------
    @staticmethod
    def create_investigation(
        inv_id: str,
        alert_id: str,
        title: str,
        severity: str,
        parameters: dict[str, Any],
    ) -> dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT INTO investigations (
                    id, alert_id, status, current_step, title, severity,
                    parameters_json, created_at, updated_at
                ) VALUES (?, ?, 'QUEUED', 'INITIALIZING', ?, ?, ?, ?, ?);
                """,
                (inv_id, alert_id, title, severity, json.dumps(parameters), now_iso, now_iso),
            )
        return Repository.get_investigation(inv_id) or {}

    @staticmethod
    def update_investigation_state(
        inv_id: str,
        status: str,
        current_step: Optional[str] = None,
        report_json: Optional[str] = None,
        trace_json: Optional[str] = None,
        model_metadata_json: Optional[str] = None,
        error_message: Optional[str] = None,
        completed: bool = False,
    ) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        fields = ["status = ?", "updated_at = ?"]
        params: list[Any] = [status, now_iso]

        if current_step is not None:
            fields.append("current_step = ?")
            params.append(current_step)
        if report_json is not None:
            fields.append("report_json = ?")
            params.append(report_json)
        if trace_json is not None:
            fields.append("trace_json = ?")
            params.append(trace_json)
        if model_metadata_json is not None:
            fields.append("model_metadata_json = ?")
            params.append(model_metadata_json)
        if error_message is not None:
            fields.append("error_message = ?")
            params.append(error_message)
        if completed:
            fields.append("completed_at = ?")
            params.append(now_iso)

        params.append(inv_id)
        sql = f"UPDATE investigations SET {', '.join(fields)} WHERE id = ?;"

        with get_db_connection() as conn:
            conn.execute(sql, params)

    @staticmethod
    def get_investigation(inv_id: str) -> Optional[dict[str, Any]]:
        with get_db_connection() as conn:
            row = conn.execute("SELECT * FROM investigations WHERE id = ?;", (inv_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("report_json"):
                try:
                    res["report"] = json.loads(res["report_json"])
                except Exception:
                    res["report"] = None
            else:
                res["report"] = None

            if res.get("trace_json"):
                try:
                    res["tool_execution_trace"] = json.loads(res["trace_json"])
                except Exception:
                    res["tool_execution_trace"] = []
            else:
                res["tool_execution_trace"] = []

            if res.get("model_metadata_json"):
                try:
                    res["model_metadata"] = json.loads(res["model_metadata_json"])
                except Exception:
                    res["model_metadata"] = None
            else:
                res["model_metadata"] = None

            return res

    @staticmethod
    def list_investigations(skip: int = 0, limit: int = 50) -> tuple[list[dict[str, Any]], int]:
        with get_db_connection() as conn:
            total_count = conn.execute("SELECT COUNT(*) as cnt FROM investigations;").fetchone()["cnt"]
            rows = conn.execute(
                "SELECT * FROM investigations ORDER BY created_at DESC LIMIT ? OFFSET ?;",
                (limit, skip),
            ).fetchall()

            res = []
            for r in rows:
                item = dict(r)
                if item.get("report_json"):
                    try:
                        item["report"] = json.loads(item["report_json"])
                    except Exception:
                        item["report"] = None
                res.append(item)
            return res, total_count

    # -----------------------------------------------------------------------
    # Benchmarks
    # -----------------------------------------------------------------------
    @staticmethod
    def list_benchmarks() -> list[dict[str, Any]]:
        with get_db_connection() as conn:
            rows = conn.execute("SELECT * FROM benchmarks ORDER BY id ASC;").fetchall()
            return [dict(r) for r in rows]

    # -----------------------------------------------------------------------
    # Metrics
    # -----------------------------------------------------------------------
    @staticmethod
    def get_metrics_overview() -> dict[str, Any]:
        with get_db_connection() as conn:
            total_alerts = conn.execute("SELECT COUNT(*) as cnt FROM alerts;").fetchone()["cnt"]
            active_investigations = conn.execute(
                "SELECT COUNT(*) as cnt FROM investigations WHERE status IN ('QUEUED', 'PLANNING', 'EVIDENCE_COLLECTION', 'HYPOTHESIS_TESTING', 'REPORT_GENERATION');"
            ).fetchone()["cnt"]
            completed_investigations = conn.execute(
                "SELECT COUNT(*) as cnt FROM investigations WHERE status = 'COMPLETED';"
            ).fetchone()["cnt"]
            failed_investigations = conn.execute(
                "SELECT COUNT(*) as cnt FROM investigations WHERE status = 'FAILED';"
            ).fetchone()["cnt"]

            return {
                "total_alerts": total_alerts,
                "active_investigations": active_investigations,
                "completed_investigations": completed_investigations,
                "failed_investigations": failed_investigations,
            }
