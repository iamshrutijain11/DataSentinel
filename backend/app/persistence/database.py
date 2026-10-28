"""SQLite Database setup and connection management for DataSentinel 2.0.

Provides thread-safe connections, schema creation, and seeding of realistic baseline data.
"""

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_db_path() -> Path:
    path = Path(settings.DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Provides a thread-local SQLite connection with foreign keys and dict-like row factory."""
    db_path = get_db_path()
    conn = sqlite3.connect(
        str(db_path),
        timeout=30.0,
        check_same_thread=False,
        isolation_level=None,  # autocommit mode, transactions handled explicitly if needed
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Initializes tables and seeds default alerts/benchmarks if empty."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Datasets table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                record_count INTEGER DEFAULT 0,
                schema_info TEXT,
                uploaded_at TEXT NOT NULL
            );
        """)

        # Alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'OPEN',
                description TEXT NOT NULL,
                source TEXT NOT NULL,
                dataset_id TEXT,
                host_identifier TEXT,
                anomaly_score REAL DEFAULT 0.0,
                timestamp TEXT NOT NULL,
                evidence_count INTEGER DEFAULT 0,
                metadata_json TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # Investigations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS investigations (
                id TEXT PRIMARY KEY,
                alert_id TEXT NOT NULL,
                status TEXT NOT NULL,
                current_step TEXT,
                title TEXT,
                severity TEXT,
                parameters_json TEXT,
                report_json TEXT,
                trace_json TEXT,
                model_metadata_json TEXT,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (alert_id) REFERENCES alerts (id)
            );
        """)

        # Benchmarks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS benchmarks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                detection_target TEXT NOT NULL,
                synthetic_data_available INTEGER DEFAULT 1
            );
        """)

        # Seed initial alerts if empty
        cursor.execute("SELECT COUNT(*) as count FROM alerts;")
        alert_count = cursor.fetchone()["count"]
        if alert_count == 0:
            _seed_initial_alerts(cursor)

        # Seed benchmarks if empty
        cursor.execute("SELECT COUNT(*) as count FROM benchmarks;")
        bench_count = cursor.fetchone()["count"]
        if bench_count == 0:
            _seed_benchmarks(cursor)

    logger.info("Database initialized successfully at %s", get_db_path())


def _seed_initial_alerts(cursor: sqlite3.Cursor) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    alerts = [
        (
            "alert-101",
            "Suspicious High-Volume Outbound Data Transfer",
            "high",
            "OPEN",
            "Anomalous spike in egress connection bytes detected to an unclassified external IP (198.51.100.44) over port 443.",
            "pyspark_anomaly_detector",
            "dataset-netflow-2026",
            "srv-finance-01 (10.0.4.15)",
            0.94,
            "2026-10-27T22:15:00Z",
            12,
            json.dumps({
                "dest_ip": "198.51.100.44",
                "dest_port": 443,
                "src_ip": "10.0.4.15",
                "bytes_transferred": 542000000,
                "baseline_mean_bytes": 1200000,
                "sigma_deviation": 6.8,
            }),
            now_iso,
        ),
        (
            "alert-102",
            "Internal Subnet Reconnaissance and Port Sweep",
            "medium",
            "OPEN",
            "Sequential SYN connection sweep across /24 CIDR block on privileged and management ports (22, 445, 3389).",
            "zeek_flow_engine",
            "dataset-zeek-2026",
            "dev-workstation-09 (10.0.12.88)",
            0.87,
            "2026-10-27T18:42:10Z",
            34,
            json.dumps({
                "source_ip": "10.0.12.88",
                "scanned_ports": [22, 445, 3389, 8080],
                "unique_target_hosts": 48,
                "duration_seconds": 120,
            }),
            now_iso,
        ),
        (
            "alert-103",
            "Anomalous Authentication Surge followed by Privilege Escalation",
            "critical",
            "OPEN",
            "45 failed SSH login attempts within 90 seconds followed by a successful interactive session and sudo invocation.",
            "suricata_ids",
            "dataset-auth-2026",
            "bastion-ext-01 (10.0.1.5)",
            0.98,
            "2026-10-28T02:11:30Z",
            8,
            json.dumps({
                "src_ip": "203.0.113.19",
                "target_user": "admin",
                "failed_count": 45,
                "success_event_id": "auth-evt-9912",
            }),
            now_iso,
        ),
    ]

    cursor.executemany("""
        INSERT INTO alerts (
            id, title, severity, status, description, source, dataset_id,
            host_identifier, anomaly_score, timestamp, evidence_count, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, alerts)


def _seed_benchmarks(cursor: sqlite3.Cursor) -> None:
    benchmarks = [
        (
            "benchmark-1",
            "Outbound Exfiltration Traffic Spike",
            "Network Egress",
            "Detects sudden volumetric anomalies in external encrypted connections exceeding 5-sigma baseline.",
            "MITRE ATT&CK T1048.003 - Exfiltration Over Alternative Protocol",
            1,
        ),
        (
            "benchmark-2",
            "Horizontal Internal Port Scan",
            "Reconnaissance",
            "Identifies fast and slow horizontal sweeps across internal enterprise RFC-1918 subnets.",
            "MITRE ATT&CK T1046 - Network Service Discovery",
            1,
        ),
        (
            "benchmark-3",
            "Credential Spray & Rapid Login Sequence",
            "Identity & Access",
            "Flags high-entropy password spraying against edge bastion or SSO endpoints.",
            "MITRE ATT&CK T1110.003 - Password Spraying",
            1,
        ),
        (
            "benchmark-4",
            "DNS Tunneling & Beaconing Query Entropy",
            "Command and Control",
            "Measures sub-domain Shannon entropy and periodic TXT/A query intervals.",
            "MITRE ATT&CK T1071.004 - DNS C2",
            1,
        ),
    ]

    cursor.executemany("""
        INSERT INTO benchmarks (id, name, category, description, detection_target, synthetic_data_available)
        VALUES (?, ?, ?, ?, ?, ?);
    """, benchmarks)
