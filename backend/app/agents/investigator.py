"""Autonomous Cybersecurity Investigation Agent.

Implements the complete investigation state machine:
PLANNING -> EVIDENCE_COLLECTION -> HYPOTHESIS_TESTING -> REPORT_GENERATION -> COMPLETED.
Coordinates Nebius Nemotron inference, allowlisted evidence tools,
citation validation, and defensive recommendation enforcement.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from app.agents.prompts import (
    PLANNING_PROMPT_TEMPLATE,
    REPORT_SYNTHESIS_PROMPT_TEMPLATE,
    SYSTEM_PROMPT,
)
from app.agents.state_machine import InvestigationContext, InvestigationState
from app.core.config import settings
from app.integrations.nebius_client import NebiusClient, get_nebius_client
from app.persistence.repository import Repository
from app.schemas.investigations import (
    EvidenceItem,
    HypothesisItem,
    HypothesisStatus,
    InvestigationReport,
    KeyFindingItem,
    ModelMetadata,
    QualitativeConfidence,
    ResponseRecommendation,
    TimelineEvent,
)
from app.security.defense import EvidenceCitationValidator, SafeResponseEnforcer
from app.security.sanitizer import wrap_untrusted_data
from app.tools.evidence_tools import ToolExecutionRegistry

logger = logging.getLogger(__name__)


class InvestigationAgent:
    """Orchestrates an end-to-end evidence-grounded AI investigation."""

    def __init__(
        self,
        nebius_client: Optional[NebiusClient] = None,
        tool_registry: Optional[ToolExecutionRegistry] = None,
    ):
        self.nebius_client = nebius_client or get_nebius_client()
        self.tool_registry = tool_registry or ToolExecutionRegistry()

    def run_investigation(
        self,
        context: InvestigationContext,
        progress_callback: Optional[Callable[[str, str], None]] = None,
    ) -> InvestigationReport:
        """Executes the full investigation lifecycle for the given context."""
        start_overall = time.perf_counter()
        inv_id = context.investigation_id

        try:
            # ---------------------------------------------------------------
            # 1. PHASE: PLANNING
            # ---------------------------------------------------------------
            self._update_progress(context, InvestigationState.PLANNING, "Formulating investigation plan and hypotheses", progress_callback)

            # Retrieve initial alert details
            alert_details, _ = self.tool_registry.execute_tool("get_alert_details", {"alert_id": context.alert_id})
            context.alert_data = alert_details.get("alert") or {}

            # Retrieve primary evidence linked to alert
            primary_ev, _ = self.tool_registry.execute_tool("get_alert_evidence", {"alert_id": context.alert_id})
            for ev in primary_ev.get("evidence", []):
                context.add_evidence(ev)

            # Generate initial plan with Nebius
            plan_response = self._execute_planning_phase(context)
            context.hypotheses = plan_response.get("hypotheses_to_test", [])
            recommended_tools = plan_response.get("recommended_tools", [])

            # ---------------------------------------------------------------
            # 2. PHASE: EVIDENCE COLLECTION
            # ---------------------------------------------------------------
            self._update_progress(context, InvestigationState.EVIDENCE_COLLECTION, "Retrieving correlated telemetry and host activity", progress_callback)

            # Execute recommended evidence tools (capped by max steps)
            executed_steps = 0
            max_steps = int(context.parameters.get("max_steps", settings.MAX_INVESTIGATION_STEPS))

            # Always inspect host activity if host identifier exists
            host_ident = context.alert_data.get("host_identifier") or ""
            if host_ident and executed_steps < max_steps:
                host_res, _ = self.tool_registry.execute_tool("get_host_activity", {"identifier": host_ident.split()[0]})
                for act in host_res.get("activities", []):
                    context.add_evidence(act)
                executed_steps += 1

            # Execute traffic statistics tool
            if executed_steps < max_steps:
                self.tool_registry.execute_tool("get_traffic_statistics", {})
                executed_steps += 1

            # Execute any other recommended tools from planning
            for tool_req in recommended_tools:
                if executed_steps >= max_steps:
                    break
                t_name = tool_req.get("tool_name", "")
                t_args = tool_req.get("arguments", {})
                if t_name in ("get_alert_evidence", "get_alert_details"):
                    continue  # already fetched
                if "alert_id" not in t_args:
                    t_args["alert_id"] = context.alert_id

                res, _ = self.tool_registry.execute_tool(t_name, t_args)
                if "events" in res:
                    for e in res["events"]:
                        context.add_evidence(e)
                executed_steps += 1

            # ---------------------------------------------------------------
            # 3. PHASE: HYPOTHESIS TESTING
            # ---------------------------------------------------------------
            self._update_progress(context, InvestigationState.HYPOTHESIS_TESTING, "Testing hypotheses against collected telemetry", progress_callback)
            hypothesis_eval = self._execute_hypothesis_testing(context)

            # ---------------------------------------------------------------
            # 4. PHASE: REPORT GENERATION
            # ---------------------------------------------------------------
            self._update_progress(context, InvestigationState.REPORT_GENERATION, "Synthesizing structured evidence-grounded report", progress_callback)
            raw_report = self._execute_report_synthesis(context, hypothesis_eval)

            # Defense validation & citation checking
            evidence_pool_list = context.get_evidence_list()
            is_valid, warnings, validated_findings, validated_timeline = (
                EvidenceCitationValidator.validate_citations(
                    findings=raw_report.get("key_findings", []),
                    timeline=raw_report.get("timeline", []),
                    evidence_pool=evidence_pool_list,
                )
            )

            # Safe response enforcement
            enforced_recommendations = SafeResponseEnforcer.filter_and_enforce(
                raw_report.get("recommendations", [])
            )

            # Assemble finalized report
            now_iso = datetime.now(timezone.utc).isoformat()
            model_meta_dict = raw_report.get("model_metadata") or {}
            model_metadata = ModelMetadata(
                provider=model_meta_dict.get("provider", "mock_nemotron"),
                model_id=model_meta_dict.get("model_id", settings.NEBIUS_MODEL),
                latency_ms=model_meta_dict.get("latency_ms"),
                tokens_prompt=model_meta_dict.get("tokens_prompt"),
                tokens_completion=model_meta_dict.get("tokens_completion"),
                tokens_total=model_meta_dict.get("tokens_total"),
                real_call_succeeded=bool(model_meta_dict.get("real_call_succeeded", False)),
                timestamp=now_iso,
            )

            final_report = InvestigationReport(
                investigation_id=inv_id,
                alert_id=context.alert_id,
                status=InvestigationState.COMPLETED,
                title=context.alert_data.get("title", f"Investigation {inv_id}"),
                severity=context.alert_data.get("severity", "medium"),
                executive_summary=raw_report.get("executive_summary", "Investigation completed."),
                timeline=validated_timeline,
                hypotheses=raw_report.get("hypotheses", []),
                key_findings=validated_findings,
                evidence=evidence_pool_list,
                uncertainty=raw_report.get("uncertainty", []),
                confidence=raw_report.get("confidence") or QualitativeConfidence(
                    level="MEDIUM",
                    type="heuristic_qualitative",
                    rationale="Evaluated based on available network and host telemetry.",
                ),
                recommendations=enforced_recommendations,
                model_metadata=model_metadata,
                tool_execution_trace=self.tool_registry.trace,
                created_at=context.created_at,
                completed_at=now_iso,
            )

            context.final_report = final_report

            # ---------------------------------------------------------------
            # 5. PHASE: COMPLETED
            # ---------------------------------------------------------------
            context.transition_to(InvestigationState.COMPLETED, "Investigation completed successfully")
            self._persist_completed_state(context, final_report)

            if progress_callback:
                progress_callback("COMPLETED", "Investigation finished successfully")

            return final_report

        except Exception as e:
            logger.exception("Investigation %s failed", inv_id)
            context.error_message = str(e)
            try:
                context.transition_to(InvestigationState.FAILED, f"Error: {str(e)}")
            except Exception:
                context.current_state = InvestigationState.FAILED

            Repository.update_investigation_state(
                inv_id=inv_id,
                status=InvestigationState.FAILED.value,
                current_step="FAILED",
                error_message=str(e),
                trace_json=json.dumps([t.model_dump() for t in self.tool_registry.trace]),
                completed=True,
            )

            if progress_callback:
                progress_callback("FAILED", f"Investigation failed: {str(e)}")

            raise

    def _update_progress(
        self,
        context: InvestigationContext,
        new_state: InvestigationState,
        step_description: str,
        callback: Optional[Callable[[str, str], None]] = None,
    ) -> None:
        context.transition_to(new_state, step_description)
        Repository.update_investigation_state(
            inv_id=context.investigation_id,
            status=new_state.value,
            current_step=step_description,
        )
        if callback:
            callback(new_state.value, step_description)

    def _execute_planning_phase(self, context: InvestigationContext) -> Dict[str, Any]:
        prompt = PLANNING_PROMPT_TEMPLATE.format(
            alert_id=context.alert_id,
            title=context.alert_data.get("title", ""),
            severity=context.alert_data.get("severity", ""),
            description=context.alert_data.get("description", ""),
            source=context.alert_data.get("source", ""),
            timestamp=context.alert_data.get("timestamp", ""),
            host_identifier=context.alert_data.get("host_identifier", ""),
            anomaly_score=context.alert_data.get("anomaly_score", 0.0),
            metadata=json.dumps(context.alert_data.get("metadata", {})),
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        resp = self.nebius_client.chat_completion(messages, temperature=0.1, max_tokens=1024)
        try:
            return json.loads(resp.get("content", "{}"))
        except Exception:
            return {
                "plan_summary": "Default plan: Gather host and network logs to evaluate benign vs adversarial scenario.",
                "hypotheses_to_test": [
                    {"id": "H1", "title": "Authorized Operation", "description": "Legitimate maintenance or scheduled job."},
                    {"id": "H2", "title": "Adversary Activity", "description": "Unauthorized exfiltration or lateral movement."},
                ],
                "recommended_tools": [{"tool_name": "get_alert_evidence", "arguments": {}}],
            }

    def _execute_hypothesis_testing(self, context: InvestigationContext) -> Dict[str, Any]:
        evidence_summary = [
            {"evidence_id": ev.evidence_id, "source": ev.data_source, "summary": ev.summary, "timestamp": ev.timestamp}
            for ev in context.get_evidence_list()
        ]

        prompt = (
            f"Compare the following hypotheses for Alert {context.alert_id} against the collected evidence:\n"
            f"<HYPOTHESES>\n{json.dumps(context.hypotheses, indent=2)}\n</HYPOTHESES>\n"
            f"<COLLECTED_EVIDENCE>\n{json.dumps(evidence_summary, indent=2)}\n</COLLECTED_EVIDENCE>\n"
            f"State which evidence items support or contradict each hypothesis and evaluate their status (SUPPORTED, REFUTED, or INCONCLUSIVE).\n"
            f"Respond in valid JSON with key 'tested_hypotheses'."
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        resp = self.nebius_client.chat_completion(messages, temperature=0.1, max_tokens=1500)
        try:
            return json.loads(resp.get("content", "{}"))
        except Exception:
            return {"tested_hypotheses": []}

    def _execute_report_synthesis(
        self, context: InvestigationContext, hypothesis_eval: Dict[str, Any]
    ) -> Dict[str, Any]:
        evidence_summary = [
            ev.model_dump() for ev in context.get_evidence_list()
        ]

        tool_trace_summary = [
            {"tool": t.tool_name, "status": t.status, "records": t.records_returned, "summary": t.summary}
            for t in self.tool_registry.trace
        ]

        prompt = REPORT_SYNTHESIS_PROMPT_TEMPLATE.format(
            alert_id=context.alert_id,
            evidence_pool_json=json.dumps(evidence_summary, indent=2),
            hypotheses_evaluation_json=json.dumps(hypothesis_eval, indent=2),
            tool_trace_summary=json.dumps(tool_trace_summary, indent=2),
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        resp = self.nebius_client.chat_completion(messages, temperature=0.1, max_tokens=2500)
        content_str = resp.get("content", "{}")

        parsed = {}
        try:
            parsed = json.loads(content_str)
        except Exception:
            logger.warning("Failed to parse JSON response from LLM report synthesis. Using safe recovery.")
            parsed = {}

        # Parse and typecast nested items
        parsed_timeline = [TimelineEvent(**t) for t in parsed.get("timeline", []) if isinstance(t, dict)]
        parsed_hypotheses = [HypothesisItem(**h) for h in parsed.get("hypotheses", []) if isinstance(h, dict)]
        parsed_findings = [KeyFindingItem(**f) for f in parsed.get("key_findings", []) if isinstance(f, dict)]
        parsed_recommendations = [
            ResponseRecommendation(**r) for r in parsed.get("recommendations", []) if isinstance(r, dict)
        ]

        conf_data = parsed.get("confidence")
        if isinstance(conf_data, dict):
            confidence = QualitativeConfidence(**conf_data)
        else:
            confidence = QualitativeConfidence(
                level="MEDIUM",
                type="heuristic_qualitative",
                rationale="Evaluated based on correlated network and system logs.",
            )

        return {
            "executive_summary": parsed.get("executive_summary") or "Investigation completed with bounded analysis.",
            "timeline": parsed_timeline,
            "hypotheses": parsed_hypotheses,
            "key_findings": parsed_findings,
            "uncertainty": parsed.get("uncertainty", ["Limited host audit log retention."]),
            "confidence": confidence,
            "recommendations": parsed_recommendations,
            "model_metadata": resp.get("metadata", {}),
        }

    def _persist_completed_state(
        self, context: InvestigationContext, report: InvestigationReport
    ) -> None:
        report_dict = report.model_dump()
        trace_dict = [t.model_dump() for t in self.tool_registry.trace]
        meta_dict = report.model_metadata.model_dump()

        Repository.update_investigation_state(
            inv_id=context.investigation_id,
            status=InvestigationState.COMPLETED.value,
            current_step="Investigation completed",
            report_json=json.dumps(report_dict),
            trace_json=json.dumps(trace_dict),
            model_metadata_json=json.dumps(meta_dict),
            completed=True,
        )
