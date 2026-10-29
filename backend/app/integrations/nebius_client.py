"""Nebius Token Factory Client & NVIDIA Nemotron Integration.

Interfaces with the OpenAI-compatible Nebius Token Factory API.
Provides verification, error handling, structured output extraction,
latency and token metrics tracking, and an auditable mock fallback mode.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import openai
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class NebiusClient:
    """Manages inference connections to Nebius Token Factory for NVIDIA Nemotron models."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        mock_mode: Optional[bool] = None,
    ):
        self.api_key = (api_key or settings.NEBIUS_API_KEY).strip()
        self.base_url = (base_url or settings.NEBIUS_BASE_URL).strip()
        self.model = (model or settings.NEBIUS_MODEL).strip()

        if mock_mode is not None:
            self.mock_mode = mock_mode
        else:
            self.mock_mode = settings.effective_mock_mode

        self._client: Optional[OpenAI] = None
        if not self.mock_mode and self.api_key:
            self._client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=45.0,
                max_retries=2,
            )

    @property
    def is_mock(self) -> bool:
        return self.mock_mode or self._client is None

    def verify_connection(self) -> Dict[str, Any]:
        """Probes Nebius Token Factory to verify authentication, model availability, and inference readiness."""
        if self.is_mock:
            return {
                "authenticated": False,
                "real_call_succeeded": False,
                "mode": "mock_nemotron",
                "message": "Nebius API Key not configured or mock mode enabled. Operating with local high-fidelity Nemotron mock.",
                "model": self.model,
                "base_url": self.base_url,
            }

        start_time = time.perf_counter()
        try:
            assert self._client is not None
            # 1. Probe models endpoint
            models_list = []
            try:
                models_resp = self._client.models.list()
                models_list = [m.id for m in models_resp.data][:10]
            except Exception as e:
                logger.warning("Models list probe returned: %s. Continuing with direct inference test.", e)

            # 2. Test lightweight inference with JSON response
            test_prompt = "Output a JSON object with key 'status' equal to 'connected'."
            resp = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a test harness. Respond in valid JSON."},
                    {"role": "user", "content": test_prompt},
                ],
                max_tokens=64,
                temperature=0.0,
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            content = resp.choices[0].message.content or ""
            parsed = {}
            try:
                parsed = json.loads(content)
            except Exception:
                pass

            return {
                "authenticated": True,
                "real_call_succeeded": True,
                "mode": "nebius",
                "model": self.model,
                "base_url": self.base_url,
                "latency_ms": round(elapsed_ms, 2),
                "available_models_sample": models_list,
                "test_output": parsed or content,
                "token_usage": {
                    "prompt_tokens": resp.usage.prompt_tokens if resp.usage else 0,
                    "completion_tokens": resp.usage.completion_tokens if resp.usage else 0,
                    "total_tokens": resp.usage.total_tokens if resp.usage else 0,
                },
            }

        except openai.AuthenticationError as e:
            return {
                "authenticated": False,
                "real_call_succeeded": False,
                "mode": "nebius",
                "error": "Authentication failed. Invalid NEBIUS_API_KEY.",
                "detail": str(e),
            }
        except openai.RateLimitError as e:
            return {
                "authenticated": True,
                "real_call_succeeded": False,
                "mode": "nebius",
                "error": "Rate limit exceeded on Nebius Token Factory.",
                "detail": str(e),
            }
        except Exception as e:
            return {
                "authenticated": False,
                "real_call_succeeded": False,
                "mode": "nebius",
                "error": "Inference probe failed.",
                "detail": str(e),
            }

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 2048,
        response_format_json: bool = True,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Executes a chat completion call with latency and token telemetry."""
        start_time = time.perf_counter()
        now_iso = datetime.now(timezone.utc).isoformat()

        if self.is_mock:
            # Deterministic, rich mock response tailored to the investigation prompt
            return self._generate_mock_completion(messages, tools)

        assert self._client is not None
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if response_format_json:
            kwargs["response_format"] = {"type": "json_object"}

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            resp = self._client.chat.completions.create(**kwargs)
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            message = resp.choices[0].message
            content = message.content or ""

            # Check for native tool calls if emitted
            native_tool_calls = []
            if hasattr(message, "tool_calls") and message.tool_calls:
                for tc in message.tool_calls:
                    native_tool_calls.append({
                        "id": tc.id,
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    })

            usage = resp.usage
            return {
                "content": content,
                "tool_calls": native_tool_calls,
                "metadata": {
                    "provider": "nebius",
                    "model_id": self.model,
                    "latency_ms": round(elapsed_ms, 2),
                    "tokens_prompt": usage.prompt_tokens if usage else None,
                    "tokens_completion": usage.completion_tokens if usage else None,
                    "tokens_total": usage.total_tokens if usage else None,
                    "real_call_succeeded": True,
                    "timestamp": now_iso,
                },
            }

        except Exception as e:
            logger.error("Nebius inference request failed: %s. Falling back to structured defensive response.", e)
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            # If real call failed unexpectedly, we record the real failure explicitly
            return {
                "content": json.dumps({
                    "error": "Nebius API call encountered an error",
                    "details": str(e),
                }),
                "tool_calls": [],
                "metadata": {
                    "provider": "nebius",
                    "model_id": self.model,
                    "latency_ms": round(elapsed_ms, 2),
                    "tokens_prompt": 0,
                    "tokens_completion": 0,
                    "tokens_total": 0,
                    "real_call_succeeded": False,
                    "error": str(e),
                    "timestamp": now_iso,
                },
            }

    def _generate_mock_completion(
        self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Provides high-quality synthetic Nemotron reasoning for local dev & testing without live credentials."""
        now_iso = datetime.now(timezone.utc).isoformat()
        last_message = messages[-1]["content"] if messages else ""

        # Identify which investigation phase is running from the prompt
        if "PLANNING" in last_message or "investigation plan" in last_message.lower():
            content = json.dumps({
                "plan_summary": "Systematic multi-hypothesis analysis comparing benign system maintenance vs malicious activity.",
                "hypotheses_to_test": [
                    {
                        "id": "H1",
                        "title": "Authorized Automated Task / Backup Routine",
                        "description": "Activity stems from an approved scheduled script, cron job, or configuration management action."
                    },
                    {
                        "id": "H2",
                        "title": "Adversarial Infiltration or Data Exfiltration",
                        "description": "Unauthorized actor or malware executing network sweeps, credential harvesting, or exfiltration."
                    }
                ],
                "recommended_tools": [
                    {"tool_name": "get_alert_evidence", "arguments": {}},
                    {"tool_name": "get_host_activity", "arguments": {"identifier": "source_host"}},
                    {"tool_name": "get_traffic_statistics", "arguments": {}}
                ]
            })
        elif "HYPOTHESIS_TESTING" in last_message:
            content = json.dumps({
                "analysis": "Evaluated retrieved telemetry against competing hypotheses.",
                "tested_hypotheses": [
                    {
                        "id": "H1",
                        "hypothesis": "Authorized Automated Task / Backup Routine",
                        "explanation": "Cron configuration and approved change tickets corroborate expected timing and behavior.",
                        "status": "SUPPORTED",
                        "supporting_evidence_ids": ["EV-NET-101-1", "EV-DNS-101-2", "EV-AUTH-101-3", "EV-PROC-101-4", "EV-CONFIG-101-5"],
                        "contradicting_evidence_ids": [],
                        "reasoning": "Audit logs confirm PAM cron trigger and rclone execution under dedicated service account."
                    },
                    {
                        "id": "H2",
                        "hypothesis": "Adversarial Infiltration or Exfiltration",
                        "explanation": "Unauthorized actor exfiltrating sensitive organizational assets.",
                        "status": "REFUTED",
                        "supporting_evidence_ids": ["EV-NET-101-1"],
                        "contradicting_evidence_ids": ["EV-AUTH-101-3", "EV-PROC-101-4", "EV-CONFIG-101-5"],
                        "reasoning": "Traffic was initiated by legitimate service account under valid cron schedule to an approved destination."
                    }
                ]
            })
        else:
            # Default structured report synthesis
            content = json.dumps({
                "executive_summary": "The investigation examined the anomalous outbound traffic spike and concluded it corresponds to an authorized nightly database synchronization routine, though bandwidth limits exceeded baseline expectations.",
                "timeline": [
                    {
                        "timestamp": "2026-10-27T22:00:00Z",
                        "event_id": "auditd-session-1029",
                        "description": "PAM authentication session opened for service account 'svc_backup_agent' via cron scheduler.",
                        "source": "linux_auditd",
                        "evidence_ref": "EV-AUTH-101-3"
                    },
                    {
                        "timestamp": "2026-10-27T22:01:15Z",
                        "event_id": "auditd-exec-9018",
                        "description": "Execution of rclone sync process initiated to secure offsite vault.",
                        "source": "linux_auditd",
                        "evidence_ref": "EV-PROC-101-4"
                    },
                    {
                        "timestamp": "2026-10-27T22:03:55Z",
                        "event_id": "zeek-dns-44211",
                        "description": "DNS lookup for backup-vault-us-east.storage-sync.net resolved to 198.51.100.44.",
                        "source": "zeek_dns",
                        "evidence_ref": "EV-DNS-101-2"
                    },
                    {
                        "timestamp": "2026-10-27T22:04:10Z",
                        "event_id": "zeek-conn-88129",
                        "description": "Outbound 542 MB TLS session initiated to 198.51.100.44 over port 443.",
                        "source": "zeek_conn",
                        "evidence_ref": "EV-NET-101-1"
                    }
                ],
                "hypotheses": [
                    {
                        "id": "H1",
                        "hypothesis": "Authorized Scheduled Synchronization",
                        "explanation": "Offsite archival backup initiated by authorized service account.",
                        "status": "SUPPORTED",
                        "supporting_evidence_ids": ["EV-AUTH-101-3", "EV-PROC-101-4", "EV-CONFIG-101-5", "EV-DNS-101-2"],
                        "contradicting_evidence_ids": [],
                        "reasoning": "Matches scheduled cron timing and valid change request CR-7719."
                    },
                    {
                        "id": "H2",
                        "hypothesis": "Unauthorized Data Exfiltration",
                        "explanation": "Exfiltration of financial assets by malicious insider or external threat actor.",
                        "status": "REFUTED",
                        "supporting_evidence_ids": ["EV-NET-101-1"],
                        "contradicting_evidence_ids": ["EV-AUTH-101-3", "EV-PROC-101-4", "EV-CONFIG-101-5"],
                        "reasoning": "Process lineage and service account credentials indicate legitimate job execution."
                    }
                ],
                "key_findings": [
                    {
                        "id": "F1",
                        "finding": "High outbound volumetric transfer of 542 MB was observed on TCP port 443.",
                        "evidence_ids": ["EV-NET-101-1"],
                        "timestamps": ["2026-10-27T22:04:10Z"],
                        "significance": "Anomalous volume exceeding 5-sigma baseline."
                    },
                    {
                        "id": "F2",
                        "finding": "Activity originated from legitimate service account svc_backup_agent executing rclone.",
                        "evidence_ids": ["EV-AUTH-101-3", "EV-PROC-101-4"],
                        "timestamps": ["2026-10-27T22:00:00Z", "2026-10-27T22:01:15Z"],
                        "significance": "Validates authorized software and identity context."
                    }
                ],
                "uncertainty": [
                    "Full packet capture payload analysis was unavailable due to end-to-end TLS encryption.",
                    "Cloud storage provider access logs at destination IP 198.51.100.44 were not directly queried."
                ],
                "confidence": {
                    "level": "HIGH",
                    "type": "heuristic_qualitative",
                    "rationale": "Strong corroborating auditd and cron evidence confirms authorized scheduled synchronization despite unusual volume spike."
                },
                "recommendations": [
                    {
                        "action": "Review host activity and verify nightly backup schedule parameters",
                        "priority": "MEDIUM",
                        "category": "VALIDATE",
                        "justification": "Confirm whether recent data volume increase was anticipated or requires updated bandwidth caps.",
                        "requires_human_authorization": False
                    },
                    {
                        "action": "Inspect relevant DNS records and storage endpoint configuration",
                        "priority": "LOW",
                        "category": "INVESTIGATE",
                        "justification": "Ensure 198.51.100.44 remains on the approved cloud storage IP allowlist.",
                        "requires_human_authorization": False
                    },
                    {
                        "action": "Isolate host after human authorization",
                        "priority": "LOW",
                        "category": "ISOLATE_WITH_APPROVAL",
                        "justification": "Contingency only: not currently recommended as activity is assessed as benign authorized backup.",
                        "requires_human_authorization": True
                    }
                ]
            })

        return {
            "content": content,
            "tool_calls": [],
            "metadata": {
                "provider": "mock_nemotron",
                "model_id": self.model,
                "latency_ms": 42.5,
                "tokens_prompt": 380,
                "tokens_completion": 512,
                "tokens_total": 892,
                "real_call_succeeded": False,
                "timestamp": now_iso,
            },
        }


# Singleton accessor
_NEBIUS_CLIENT: Optional[NebiusClient] = None


def get_nebius_client() -> NebiusClient:
    global _NEBIUS_CLIENT
    if _NEBIUS_CLIENT is None:
        _NEBIUS_CLIENT = NebiusClient()
    return _NEBIUS_CLIENT


def set_nebius_client(client: NebiusClient) -> None:
    global _NEBIUS_CLIENT
    _NEBIUS_CLIENT = client
