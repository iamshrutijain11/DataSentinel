"""Datasets API router for DataSentinel 2.0.

Endpoints:
- POST /api/v1/datasets/upload
- GET  /api/v1/datasets/{dataset_id}
- GET  /api/v1/datasets
"""

import shutil
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.config import settings
from app.persistence.repository import Repository
from app.schemas.datasets import DatasetRecord, DatasetUploadResponse

router = APIRouter()


@router.post(
    "/upload",
    response_model=DatasetUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new dataset",
    description="Uploads PCAP, Zeek logs, NetFlow, or Parquet security datasets for processing.",
)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetUploadResponse:
    dataset_id = f"ds-{uuid.uuid4().hex[:10]}"
    storage_dir = Path(settings.DATASET_STORAGE_DIR)
    storage_dir.mkdir(parents=True, exist_ok=True)

    dest_path = storage_dir / f"{dataset_id}_{file.filename}"
    with dest_path.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    size = dest_path.stat().st_size
    Repository.create_dataset(
        dataset_id=dataset_id,
        filename=file.filename or "unnamed_dataset",
        path=str(dest_path),
        size_bytes=size,
    )

    return DatasetUploadResponse(
        dataset_id=dataset_id,
        filename=file.filename or "unnamed_dataset",
        size_bytes=size,
        detail="uploaded",
    )


@router.get(
    "/{dataset_id}",
    response_model=DatasetRecord,
    summary="Retrieve dataset metadata",
    description="Fetch record counts, file size, and storage path for an uploaded dataset.",
)
async def get_dataset(dataset_id: str) -> DatasetRecord:
    record = Repository.get_dataset(dataset_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID '{dataset_id}' was not found.",
        )
    return DatasetRecord(**record)


@router.get(
    "",
    response_model=List[DatasetRecord],
    summary="List uploaded datasets",
    description="Lists all security datasets registered in the system.",
)
async def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> List[DatasetRecord]:
    records = Repository.list_datasets(skip=skip, limit=limit)
    return [DatasetRecord(**r) for r in records]
