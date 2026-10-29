"""Schemas for Datasets."""

from typing import List, Optional
from pydantic import BaseModel, Field


class DatasetRecord(BaseModel):
    id: str
    filename: str
    path: str
    size_bytes: int
    record_count: int = 0
    schema_info: Optional[str] = None
    uploaded_at: str


class DatasetUploadResponse(BaseModel):
    dataset_id: str
    filename: str
    size_bytes: int
    detail: str = "uploaded"
