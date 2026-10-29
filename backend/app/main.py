"""Entry point for the DataSentinel 2.0 FastAPI backend.

Implements the shared /api/v1 contract:
- POST /api/v1/datasets/upload
- GET  /api/v1/datasets/{id}
- GET  /api/v1/alerts
- GET  /api/v1/alerts/{id}
- POST /api/v1/investigations
- GET  /api/v1/investigations/{id}
- GET  /api/v1/metrics/overview
- GET  /api/v1/benchmarks
- GET  /api/v1/health
"""

import logging
from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.v1 import (
    alerts,
    benchmarks,
    datasets,
    health,
    investigations,
    metrics,
)
from app.core.config import settings
from app.persistence.database import init_db
from app.services.job_runner import get_job_runner

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("datasentinel.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup initialization and graceful shutdown."""
    logger.info("Starting DataSentinel 2.0 Backend (%s)...", settings.ENVIRONMENT)
    # Initialize database tables and seed baseline data
    init_db()
    # Initialize background worker pool
    get_job_runner()
    yield
    # Graceful shutdown
    logger.info("Shutting down DataSentinel 2.0 Backend...")
    get_job_runner().shutdown(wait=False)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Autonomous AI Cybersecurity Investigation Agent and Analytics Engine powered by NVIDIA Nemotron and Nebius Token Factory.",
        openapi_url="/api/v1/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register canonical /api/v1 router
    api_v1_router = APIRouter(prefix="/api/v1")
    api_v1_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
    api_v1_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
    api_v1_router.include_router(investigations.router, prefix="/investigations", tags=["investigations"])
    api_v1_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
    api_v1_router.include_router(benchmarks.router, prefix="/benchmarks", tags=["benchmarks"])
    api_v1_router.include_router(health.router, prefix="/health", tags=["health"])

    app.include_router(api_v1_router)

    # Root redirect to documentation and top-level health convenience route
    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/docs")

    @app.get("/health", include_in_schema=False)
    async def root_health():
        return RedirectResponse(url="/api/v1/health")

    return app


app = create_app()
