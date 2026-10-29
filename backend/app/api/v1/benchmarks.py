"""Benchmarks API router for DataSentinel 2.0.

Endpoints:
- GET /api/v1/benchmarks
"""

from typing import List
from fastapi import APIRouter

from app.persistence.repository import Repository
from app.schemas.metrics import BenchmarkItem

router = APIRouter()


@router.get(
    "",
    response_model=List[BenchmarkItem],
    summary="List benchmarks",
    description="Returns benchmark evaluation scenarios mapped to MITRE ATT&CK techniques.",
)
async def list_benchmarks() -> List[BenchmarkItem]:
    records = Repository.list_benchmarks()
    return [
        BenchmarkItem(
            id=r["id"],
            name=r["name"],
            category=r["category"],
            description=r["description"],
            detection_target=r["detection_target"],
            synthetic_data_available=bool(r.get("synthetic_data_available", 1)),
        )
        for r in records
    ]
