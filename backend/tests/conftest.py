"""Pytest configuration and global fixtures for DataSentinel 2.0 Backend tests."""

import pytest
from app.persistence.database import init_db


@pytest.fixture(scope="session", autouse=True)
def setup_database_session():
    """Initializes the database schema and seed data once for all test runs."""
    init_db()
