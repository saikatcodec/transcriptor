"""
Shared pytest fixtures.

Tests run against a real PostgreSQL database (Neon or local).
The DATABASE_URL must be set as an environment variable before running tests.

    export DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
    pytest -v

Each test gets a fresh schema via a transaction that is rolled back on teardown,
so tests are fully isolated without dropping/recreating tables.
"""

import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncConnection,
)

from app.db.database import Base, get_db
from app.main import app
from app.core.settings import get_settings


def _get_test_db_url() -> str:
    """
    Return the test DATABASE_URL, normalised to psycopg3 scheme.
    Reads from the DATABASE_URL env var (same one used by the app).
    """
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        # Try reading from .env file as a fallback
        from dotenv import dotenv_values
        raw = dotenv_values(".env").get("DATABASE_URL", "")

    if not raw:
        pytest.fail(
            "DATABASE_URL is not set. "
            "Set it to your Neon connection string before running tests:\n"
            "  export DATABASE_URL='postgresql://user:pass@host/db?sslmode=require'"
        )

    # Normalise scheme to psycopg3
    if raw.startswith("postgres://") and "+psycopg" not in raw:
        raw = raw.replace("postgres://", "postgresql+psycopg://", 1)
    elif raw.startswith("postgresql://") and "+psycopg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw


# Test engine (module-scoped — one engine for entire test run) 
@pytest.fixture(scope="session")
def test_db_url() -> str:
    return _get_test_db_url()


@pytest.fixture(scope="session")
def test_engine(test_db_url):
    engine = create_async_engine(
        test_db_url,
        echo=False,
        pool_size=2,
        max_overflow=2,
        pool_pre_ping=True,
    )
    return engine


# Create tables once per test session, drop after all tests
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_test_tables(test_engine):
    """Create all tables once before the test session, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# Per-test transaction rollback for isolation
@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncSession:
    """
    Each test runs inside a transaction that is rolled back at the end.
    This gives full isolation without recreating tables between tests.
    """
    async with test_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()


# HTTP test client with DB override
@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """
    AsyncClient with the DB dependency replaced by the test session
    so HTTP requests hit the same rolled-back transaction.
    """

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
