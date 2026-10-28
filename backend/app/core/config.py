"""Configuration settings for DataSentinel 2.0 Backend.

Loads settings from environment variables or .env file with sensible defaults.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    # Application Info
    APP_NAME: str = "DataSentinel 2.0 Backend"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    DEBUG: bool = Field(default_factory=lambda: os.getenv("DEBUG", "true").lower() in ("1", "true", "yes"))

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["*"]

    # Nebius Token Factory & NVIDIA Nemotron Configuration
    NEBIUS_API_KEY: str = Field(default_factory=lambda: os.getenv("NEBIUS_API_KEY", ""))
    NEBIUS_BASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "NEBIUS_BASE_URL", "https://api.studio.nebius.ai/v1"
        )
    )
    NEBIUS_MODEL: str = Field(
        default_factory=lambda: os.getenv(
            "NEBIUS_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct"
        )
    )
    # Explicit override for mock mode (auto-enabled if NEBIUS_API_KEY is not set)
    MOCK_MODE: bool = Field(
        default_factory=lambda: os.getenv("MOCK_MODE", "").lower() in ("1", "true", "yes")
    )

    # Persistence
    DATABASE_PATH: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_PATH", str(BASE_DIR / "datasentinel.db")
        )
    )
    DATASET_STORAGE_DIR: str = Field(
        default_factory=lambda: os.getenv(
            "DATASET_STORAGE_DIR", str(BASE_DIR.parent / "sample-data" / "datasets")
        )
    )

    # Agent Execution Limits & Safety Controls
    MAX_INVESTIGATION_CONCURRENCY: int = Field(
        default_factory=lambda: int(os.getenv("MAX_INVESTIGATION_CONCURRENCY", "4"))
    )
    MAX_INVESTIGATION_STEPS: int = Field(
        default_factory=lambda: int(os.getenv("MAX_INVESTIGATION_STEPS", "6"))
    )
    MAX_TOOL_ROWS: int = Field(
        default_factory=lambda: int(os.getenv("MAX_TOOL_ROWS", "25"))
    )
    INVESTIGATION_TIMEOUT_SECONDS: int = Field(
        default_factory=lambda: int(os.getenv("INVESTIGATION_TIMEOUT_SECONDS", "120"))
    )
    MAX_JOB_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("MAX_JOB_RETRIES", "2"))
    )

    @property
    def is_nebius_configured(self) -> bool:
        """Returns True if a non-placeholder Nebius API key is set."""
        key = self.NEBIUS_API_KEY.strip()
        return bool(key and not key.startswith("your_") and not key == "mock")

    @property
    def effective_mock_mode(self) -> bool:
        """Determines if the system operates in mock inference mode."""
        if self.MOCK_MODE:
            return True
        return not self.is_nebius_configured


settings = Settings()
