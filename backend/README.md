# DataSentinel 2.0 — Backend & Agentic AI Engine
**Nebius × NVIDIA Global AI Hackathon — Module 2 (Agentic AI, Nemotron & Backend API)**

DataSentinel 2.0 is an enterprise-grade autonomous security investigation platform. This backend implements a real-time, hypothesis-driven AI security analyst powered by **NVIDIA Nemotron** (via **Nebius Token Factory**) and a high-performance **FastAPI** backend that interfaces directly with large-scale security data engines (Person 1's PySpark pipeline) and provides the complete `/api/v1` contract to the frontend (Person 3's Next.js dashboard).

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Next.js Frontend (Person 3)      |
                      +---------------------------------------+
                                          |
                              REST /api/v1 / SSE Polling
                                          v
+---------------------------------------------------------------------------------+
|                        DataSentinel 2.0 FastAPI Backend                         |
|                                                                                 |
|  +--------------------+   +-----------------------+   +----------------------+  |
|  | /alerts Endpoint   |   | /investigations Route |   | /metrics & Health    |  |
|  +--------------------+   +-----------------------+   +----------------------+  |
|            |                         |                            |             |
|            v                         v                            v             |
|   +-----------------+     +-----------------------+      +-------------------+  |
|   | SQLite DB (WAL) | <---| Bounded Job Runner    |      | Nebius Probe      |  |
|   +-----------------+     +-----------------------+      +-------------------+  |
|                                      |                                          |
|                                      v                                          |
|                       +-------------------------------+                         |
|                       |  Investigation State Machine  |                         |
|                       +-------------------------------+                         |
|                                      |                                          |
|         +----------------------------+----------------------------+             |
|         |                            |                            |             |
|         v                            v                            v             |
|  +--------------+            +----------------+           +------------------+  |
|  | Evidence     |            | Prompt-Inject  |           | NVIDIA Nemotron  |  |
|  | Tools (7)    |            | Defense Layer  |           | via Nebius API   |  |
|  +--------------+            +----------------+           +------------------+  |
|         |                                                         |             |
|         v                                                         v             |
|  +---------------------------+                            +------------------+  |
|  | Data Engine Adapter       |                            | Live Inference / |  |
|  | (Mock <-> PySpark Engine) |                            | Auditable Mock   |  |
|  +---------------------------+                            +------------------+  |
+---------------------------------------------------------------------------------+
```

---

## Key Capabilities

### 1. Bounded Investigation State Machine
Every alert undergoes rigorous multi-stage reasoning through an immutable state machine:
```
QUEUED -> PLANNING -> EVIDENCE_COLLECTION -> HYPOTHESIS_TESTING -> REPORT_GENERATION -> COMPLETED (or FAILED)
```
- **QUEUED**: Job registered in SQLite with unique UUID; client receives `201 Created` immediately.
- **PLANNING**: Agent inspects alert metadata, retrieves initial evidence, and generates at least two competing hypotheses (e.g., *Authorized Backup / Maintenance* vs *Data Exfiltration / Infiltration*).
- **EVIDENCE_COLLECTION**: Agent queries allowlisted evidence tools (Zeek network flows, Linux auditd logs, traffic statistics, host activity) within strict step and row caps.
- **HYPOTHESIS_TESTING**: Agent systematically compares collected observations against hypotheses, identifying supporting vs contradictory facts.
- **REPORT_GENERATION**: Agent synthesizes an evidence-grounded report, executes citation validation, and applies safe response enforcement.
- **COMPLETED**: Final structured report and full tool execution trace persisted in SQLite.

### 2. Nebius Token Factory & NVIDIA Nemotron Integration
- Native OpenAI-compatible client integration targetable at `https://api.studio.nebius.ai/v1`.
- Configured by default for `nvidia/llama-3.1-nemotron-70b-instruct`.
- **Auditable Transparency**: Every report and metric overview explicitly records:
  - `provider`: `"nebius"` vs `"mock_nemotron"`
  - `model_id`: specific model executed
  - `real_call_succeeded`: boolean flag confirming genuine remote inference
  - `latency_ms`: end-to-end turnaround time
  - `tokens_prompt`, `tokens_completion`, `tokens_total`: token telemetry
- **Zero-Friction Fallback**: When `NEBIUS_API_KEY` is not provided, the backend seamlessly switches to an auditable local synthetic Nemotron reasoning engine, ensuring complete testability and frontend integration offline.

### 3. Allowlisted, Read-Only Evidence Tools
The LLM is strictly constrained to 7 deterministic, allowlisted tools. Arbitrary code execution, shell commands, and raw SQL are impossible by design:
1. `get_alert_details(alert_id)`: Authoritative metadata, anomaly score, and source sensor.
2. `get_alert_evidence(alert_id)`: Direct primary sensor records linked to the alert.
3. `query_related_events(alert_id, filters)`: Correlated Zeek, Suricata, and auditd events.
4. `get_host_activity(identifier, time_range)`: Process launches, user sessions, and connection flows.
5. `get_traffic_statistics(filters)`: Volume baselines, peak throughput, and sigma deviations.
6. `get_related_alerts(alert_id)`: Co-occurring alerts on adjacent hosts or network segments.
7. `get_dataset_metadata(dataset_id)`: Partition counts, schema info, and time bounds.

*All tools enforce row bounding (`MAX_TOOL_ROWS=25`), argument sanitization, query caching, and complete execution audit logging.*

### 4. Defense-in-Depth & Prompt-Injection Resistance
- **Untrusted Content Encapsulation**: Security logs and network payloads are treated strictly as untrusted passive data, wrapped in `<SECURITY_EVIDENCE_DATA>` blocks.
- **Adversarial Pattern Stripping**: Neutralizes instruction override markers (`IGNORE PREVIOUS INSTRUCTIONS`, `<|im_start|>`, `[INST]`, etc.).
- **Evidence Citation Verification**: `EvidenceCitationValidator` cross-references all factual findings and timeline events against actual retrieved evidence IDs. Hallucinated citations are stripped.
- **Safe Response Enforcer**: Rejects destructive actions (e.g. disk wiping, raw command execution). Enforces `requires_human_authorization = True` on host isolation.

---

## Canonical API Contract (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health, SQLite WAL status, and Nebius configuration |
| `GET` | `/api/v1/metrics/overview` | Alert counts, active investigations, model provider, and latency |
| `GET` | `/api/v1/benchmarks` | MITRE ATT&CK benchmark definitions |
| `GET` | `/api/v1/alerts` | Paginated alerts with severity and status filtering |
| `GET` | `/api/v1/alerts/{id}` | Detailed alert context and anomaly score |
| `POST`| `/api/v1/alerts` | Alert ingestion endpoint for Person 1's PySpark detector |
| `POST`| `/api/v1/investigations` | Queues an async Nemotron investigation (`201 Created`) |
| `GET` | `/api/v1/investigations/{id}` | Status polling and full structured investigation report |
| `GET` | `/api/v1/investigations` | Paginated list of historical investigations |
| `POST`| `/api/v1/datasets/upload` | Upload dataset (PCAP, NetFlow, Zeek, Parquet) |
| `GET` | `/api/v1/datasets/{id}` | Retrieve uploaded dataset metadata |

Interactive OpenAPI documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

---

## Getting Started

### Prerequisites
- Python 3.11+
- Git

### Installation
```bash
# Clone the repository and enter the backend directory
cd "d:/DataSentinel 2.0/backend"

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
To enable live inference through Nebius Token Factory:
```env
NEBIUS_API_KEY=your_actual_nebius_api_key_here
NEBIUS_BASE_URL=https://api.studio.nebius.ai/v1
NEBIUS_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
MOCK_MODE=false
```
*If `NEBIUS_API_KEY` is omitted or left empty, DataSentinel automatically runs in high-fidelity mock mode.*

### Running the Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Running the Automated Test Suite

The test suite validates the entire API contract, prompt-injection defense, citation checking, tools, and background runner:
```bash
pytest -v
```

### Test Coverage Highlights:
- `tests/test_api.py`: All 9 REST endpoints, status codes, pagination, and polling.
- `tests/test_nebius.py`: Nebius connection probe, auth failure handling, rate limiting, and opt-in live test.
- `tests/test_agent.py`: Complete state machine transitions and end-to-end multi-hypothesis reasoning.
- `tests/test_tools.py`: All 7 evidence tools, input validation, row bounding, and caching.
- `tests/test_prompt_injection.py`: Resistance to adversarial log prompts and token escaping.
- `tests/test_defense_citations.py`: Real-evidence citation enforcement and safe action filtering.
- `tests/test_adapter.py`: Contract compatibility and seamless hot-swapping for Person 1's PySpark data engine.

---

## Production Deployment Note (Worker Queue)

For the Hackathon MVP, the backend uses a bounded in-process `ThreadPoolExecutor` (`app/services/job_runner.py`) backed by SQLite WAL mode. 

For multi-instance distributed production deployment:
1. Replace `BackgroundJobRunner` with **Celery** or **Temporal** using Redis/RabbitMQ.
2. The SQLite repository (`app/persistence/repository.py`) can be swapped for PostgreSQL by updating connection strings without altering business or agent logic.
