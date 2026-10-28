"""Data Engine Adapter interface and Contract-Compatible Mock Adapter.

Provides the standardized evidence retrieval contract for DataSentinel 2.0.
Can be seamlessly swapped with Person 1's PySpark data engine without
modifying API routes or Agent investigation logic.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

from app.persistence.repository import Repository

logger = logging.getLogger(__name__)


class DataEngineAdapterInterface(ABC):
    """Abstract interface defining the evidence query contract."""

    @abstractmethod
    def get_alert_details(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve authoritative metadata and parameters for a specific alert."""
        pass

    @abstractmethod
    def get_alert_evidence(self, alert_id: str) -> List[Dict[str, Any]]:
        """Retrieve direct primary evidence records linked to this alert."""
        pass

    @abstractmethod
    def query_related_events(
        self, alert_id: str, filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Query correlated security events (Zeek, Suricata, Syslog) within the incident time window."""
        pass

    @abstractmethod
    def get_host_activity(
        self, identifier: str, time_range: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve recent authentication, process execution, and network flow activity for a host or IP."""
        pass

    @abstractmethod
    def get_traffic_statistics(
        self, filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Aggregate traffic volume, protocol breakdown, and baseline comparison metrics."""
        pass

    @abstractmethod
    def get_related_alerts(self, alert_id: str) -> List[Dict[str, Any]]:
        """Find co-occurring or topologically related alerts within the environment."""
        pass

    @abstractmethod
    def get_dataset_metadata(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve schema, partition count, and time bounds for the underlying dataset."""
        pass


class MockDataEngineAdapter(DataEngineAdapterInterface):
    """High-fidelity contract-compatible mock adapter loaded with realistic security incident fixtures."""

    def __init__(self):
        self._fixtures = self._init_fixtures()

    def _init_fixtures(self) -> Dict[str, Any]:
        return {
            "evidence": {
                "alert-101": [
                    {
                        "evidence_id": "EV-NET-101-1",
                        "event_id": "zeek-conn-88129",
                        "timestamp": "2026-10-27T22:04:10Z",
                        "data_source": "zeek_conn",
                        "summary": "Outbound TCP session 10.0.4.15:48192 -> 198.51.100.44:443. Duration: 412s. Sent: 542 MB, Recv: 12 KB. State: SF (Normal termination).",
                        "raw_details": {
                            "src_ip": "10.0.4.15",
                            "dst_ip": "198.51.100.44",
                            "dst_port": 443,
                            "protocol": "tcp",
                            "bytes_out": 542000000,
                            "bytes_in": 12400,
                            "conn_state": "SF",
                        },
                    },
                    {
                        "evidence_id": "EV-DNS-101-2",
                        "event_id": "zeek-dns-44211",
                        "timestamp": "2026-10-27T22:03:55Z",
                        "data_source": "zeek_dns",
                        "summary": "DNS query for 'backup-vault-us-east.storage-sync.net' from 10.0.4.15 resolved to 198.51.100.44 (TTL: 300).",
                        "raw_details": {
                            "query": "backup-vault-us-east.storage-sync.net",
                            "qtype": "A",
                            "answers": ["198.51.100.44"],
                            "rcode": "NOERROR",
                        },
                    },
                    {
                        "evidence_id": "EV-AUTH-101-3",
                        "event_id": "auditd-session-1029",
                        "timestamp": "2026-10-27T22:00:00Z",
                        "data_source": "linux_auditd",
                        "summary": "PAM authentication session opened for service account 'svc_backup_agent' via local cron scheduler.",
                        "raw_details": {
                            "host": "srv-finance-01",
                            "user": "svc_backup_agent",
                            "pam_service": "cron",
                            "tty": None,
                        },
                    },
                    {
                        "evidence_id": "EV-PROC-101-4",
                        "event_id": "auditd-exec-9018",
                        "timestamp": "2026-10-27T22:01:15Z",
                        "data_source": "linux_auditd",
                        "summary": "Process execution: '/usr/bin/rclone sync /data/finance-archives backup-vault:encrypted-sync --bwlimit 25M' PID: 4912 under UID 1004 (svc_backup_agent).",
                        "raw_details": {
                            "pid": 4912,
                            "ppid": 1024,
                            "exe": "/usr/bin/rclone",
                            "cmdline": "rclone sync /data/finance-archives backup-vault:encrypted-sync --bwlimit 25M",
                        },
                    },
                    {
                        "evidence_id": "EV-CONFIG-101-5",
                        "event_id": "config-cron-file-01",
                        "timestamp": "2026-10-20T10:00:00Z",
                        "data_source": "host_inventory",
                        "summary": "Registered scheduled cron job '/etc/cron.d/finance-nightly-sync' configured to trigger daily at 22:00 UTC.",
                        "raw_details": {
                            "cron_entry": "0 22 * * * svc_backup_agent /usr/local/bin/nightly_sync.sh",
                            "owner": "root",
                            "approved_cr": "CR-7719",
                        },
                    },
                ],
                "alert-102": [
                    {
                        "evidence_id": "EV-SCAN-102-1",
                        "event_id": "zeek-conn-77119",
                        "timestamp": "2026-10-27T18:40:02Z",
                        "data_source": "zeek_conn",
                        "summary": "48 rapid TCP SYN attempts to 10.0.12.0/24 on port 22, 445, 3389 originating from 10.0.12.88.",
                        "raw_details": {
                            "src_ip": "10.0.12.88",
                            "target_subnet": "10.0.12.0/24",
                            "ports_scanned": [22, 445, 3389],
                            "flags": "S",
                            "conn_count": 48,
                        },
                    },
                    {
                        "evidence_id": "EV-HOST-102-2",
                        "event_id": "inv-asset-88",
                        "timestamp": "2026-10-27T18:35:00Z",
                        "data_source": "asset_cmdb",
                        "summary": "Host dev-workstation-09 assigned to user Alice Johnson (Lead Site Reliability Engineer).",
                        "raw_details": {
                            "hostname": "dev-workstation-09",
                            "ip": "10.0.12.88",
                            "owner": "alice.johnson@internal.org",
                            "department": "Platform Operations",
                        },
                    },
                    {
                        "evidence_id": "EV-TICKET-102-3",
                        "event_id": "jira-cr-8842",
                        "timestamp": "2026-10-27T18:30:00Z",
                        "data_source": "itsm_tickets",
                        "summary": "Approved Change Request CR-8842: 'Automated Ansible health check and SSH reachability audit across Dev staging subnets'.",
                        "raw_details": {
                            "ticket_id": "CR-8842",
                            "assignee": "alice.johnson",
                            "status": "IN_PROGRESS",
                            "window": "2026-10-27 18:30 - 19:30 UTC",
                        },
                    },
                ],
                "alert-103": [
                    {
                        "evidence_id": "EV-AUTH-103-1",
                        "event_id": "auth-log-5510",
                        "timestamp": "2026-10-28T02:09:40Z",
                        "data_source": "sshd_auth",
                        "summary": "45 failed password attempts for user 'admin', 'root', 'deploy' from external IP 203.0.113.19 within 90 seconds.",
                        "raw_details": {
                            "src_ip": "203.0.113.19",
                            "target_host": "bastion-ext-01",
                            "failed_attempts": 45,
                            "auth_method": "password",
                        },
                    },
                    {
                        "evidence_id": "EV-AUTH-103-2",
                        "event_id": "auth-log-5599",
                        "timestamp": "2026-10-28T02:11:25Z",
                        "data_source": "sshd_auth",
                        "summary": "Accepted publickey for user 'deploy' from 203.0.113.19 port 52310 ssh2: RSA SHA256:qZ984xL...",
                        "raw_details": {
                            "src_ip": "203.0.113.19",
                            "user": "deploy",
                            "auth_method": "publickey",
                            "key_fingerprint": "RSA SHA256:qZ984xL...",
                        },
                    },
                    {
                        "evidence_id": "EV-SUDO-103-3",
                        "event_id": "sudo-log-102",
                        "timestamp": "2026-10-28T02:11:35Z",
                        "data_source": "sudo_audit",
                        "summary": "USER=deploy ; COMMAND=/bin/bash ; PWD=/home/deploy ; Successful escalation to UID 0 (root).",
                        "raw_details": {
                            "invoking_user": "deploy",
                            "target_user": "root",
                            "command": "/bin/bash",
                            "success": True,
                        },
                    },
                    {
                        "evidence_id": "EV-THREAT-103-4",
                        "event_id": "threat-intel-203",
                        "timestamp": "2026-10-28T02:12:00Z",
                        "data_source": "threat_intel_feed",
                        "summary": "IP 203.0.113.19 listed on abuse databases for automated SSH credential brute-forcing in the past 24 hours.",
                        "raw_details": {
                            "ip": "203.0.113.19",
                            "category": "Scanner / Brute Force",
                            "confidence": "HIGH",
                        },
                    },
                ],
            }
        }

    def get_alert_details(self, alert_id: str) -> Optional[Dict[str, Any]]:
        # Fetch from DB repository for consistency
        alert = Repository.get_alert(alert_id)
        if alert:
            return alert
        # Fallback fixture if not in DB
        return {
            "id": alert_id,
            "title": f"Security Anomaly {alert_id}",
            "severity": "medium",
            "status": "OPEN",
            "description": "Synthetic alert for testing environment.",
            "source": "mock_data_engine",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "evidence_count": 0,
        }

    def get_alert_evidence(self, alert_id: str) -> List[Dict[str, Any]]:
        return self._fixtures["evidence"].get(alert_id, [])

    def query_related_events(
        self, alert_id: str, filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        evidence = self.get_alert_evidence(alert_id)
        if not filters:
            return evidence[:20]

        source_filter = filters.get("data_source")
        if source_filter:
            return [e for e in evidence if e.get("data_source") == source_filter][:20]

        return evidence[:20]

    def get_host_activity(
        self, identifier: str, time_range: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        # Filter all fixtures containing the host or IP identifier
        results = []
        for alert_ev in self._fixtures["evidence"].values():
            for item in alert_ev:
                summary = item.get("summary", "")
                raw = str(item.get("raw_details", {}))
                if identifier in summary or identifier in raw:
                    results.append(item)
        return results[:20]

    def get_traffic_statistics(
        self, filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        return {
            "window": "past_24_hours",
            "total_bytes_out": 1284920000,
            "total_bytes_in": 45192000,
            "top_outbound_ports": [443, 80, 22, 53],
            "baseline_bytes_hourly_mean": 15000000,
            "current_hourly_peak": 542000000,
            "anomaly_deviation_sigma": 6.8,
            "unique_external_destinations": 142,
        }

    def get_related_alerts(self, alert_id: str) -> List[Dict[str, Any]]:
        alerts, _ = Repository.list_alerts(limit=10)
        return [a for a in alerts if a.get("id") != alert_id]

    def get_dataset_metadata(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        record = Repository.get_dataset(dataset_id)
        if record:
            return record
        return {
            "id": dataset_id,
            "name": f"Security Log Partition {dataset_id}",
            "record_count": 4500000,
            "partitions": 32,
            "time_range": "2026-10-20T00:00:00Z to 2026-10-28T00:00:00Z",
            "log_types": ["zeek_conn", "zeek_dns", "auditd", "suricata_eve"],
            "storage_format": "parquet",
        }


# Singleton factory for dependency injection
_ADAPTER_INSTANCE: Optional[DataEngineAdapterInterface] = None


def get_data_engine_adapter() -> DataEngineAdapterInterface:
    """Returns the configured data engine adapter (mock or real PySpark adapter)."""
    global _ADAPTER_INSTANCE
    if _ADAPTER_INSTANCE is None:
        _ADAPTER_INSTANCE = MockDataEngineAdapter()
    return _ADAPTER_INSTANCE


def set_data_engine_adapter(adapter: DataEngineAdapterInterface) -> None:
    """Allows testing or runtime hot-swapping with Person 1's PySpark data engine."""
    global _ADAPTER_INSTANCE
    _ADAPTER_INSTANCE = adapter
