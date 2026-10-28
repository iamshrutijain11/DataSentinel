"""Registry of tool schemas compatible with OpenAI / NVIDIA Nemotron tool calling."""

from typing import Any, Dict, List

TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_alert_details",
            "description": "Retrieve comprehensive metadata, attributes, and detection context for a specific alert.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alert_id": {
                        "type": "string",
                        "description": "The unique alert identifier (e.g., 'alert-101')",
                    }
                },
                "required": ["alert_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_alert_evidence",
            "description": "Retrieve the primary evidence records and sensor observations directly associated with the alert.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alert_id": {
                        "type": "string",
                        "description": "The unique alert identifier to retrieve primary evidence for",
                    }
                },
                "required": ["alert_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_related_events",
            "description": "Query correlated security events across Zeek network logs, auditd, and IDS sensors around the event window.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alert_id": {
                        "type": "string",
                        "description": "The alert ID context",
                    },
                    "filters": {
                        "type": "object",
                        "description": "Optional filters such as 'data_source', 'port', 'ip'",
                    },
                },
                "required": ["alert_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_host_activity",
            "description": "Retrieve authentication, process launch, and active network connections for a specific host or IP.",
            "parameters": {
                "type": "object",
                "properties": {
                    "identifier": {
                        "type": "string",
                        "description": "Host name or IP address to inspect (e.g., 'srv-finance-01', '10.0.4.15')",
                    },
                    "time_range": {
                        "type": "object",
                        "description": "Optional start and end ISO time range bounds",
                    },
                },
                "required": ["identifier"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_traffic_statistics",
            "description": "Retrieve baseline vs observed traffic volume statistics, protocol breakdown, and sigma anomaly deviations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filters": {
                        "type": "object",
                        "description": "Optional criteria for traffic aggregation",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_related_alerts",
            "description": "Find co-occurring or topologically linked alerts occurring on adjacent hosts or network segments.",
            "parameters": {
                "type": "object",
                "properties": {
                    "alert_id": {
                        "type": "string",
                        "description": "The focal alert ID",
                    }
                },
                "required": ["alert_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dataset_metadata",
            "description": "Retrieve schema, partition count, and ingestion metadata for the underlying security dataset.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dataset_id": {
                        "type": "string",
                        "description": "Dataset identifier",
                    }
                },
                "required": ["dataset_id"],
            },
        },
    },
]


def get_tool_definitions() -> List[Dict[str, Any]]:
    """Returns the list of allowlisted OpenAI-compatible tool specifications."""
    return TOOL_DEFINITIONS
