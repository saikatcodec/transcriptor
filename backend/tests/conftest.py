"""
Shared pytest fixtures.

Tests run against a real PostgreSQL database (Neon or local).
Set DATABASE_URL before running:

    export DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"
    pytest -v

Isolation strategy
------------------
We use a dedicated test schema ("test_schema") that is created fresh at the
start of the session and dropped at the end. Before each test, all tables are
TRUNCATED so every test starts with a clean slate. This is simpler and more
reliable than savepoint-based rollback when the app has services that open
their own DB connections (e.g. SessionService, WebSocket endpoint).
"""

import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.database import Base, get_db
from app.main import app


# Resolve DATABASE_URL 
def _get_test_db_url() -> str:
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        try:
            from dotenv import dotenv_values
            raw = dotenv_values(".env").get("DATABASE_URL", "")
        except ImportError:
            pass

    if not raw:
        pytest.fail(
            "DATABASE_URL is not set.\n"
            "  export DATABASE_URL='postgresql://user:pass@host/db?sslmode=require'"
        )

    if raw.startswith("postgres://") and "+psycopg" not in raw:
        raw = raw.replace("postgres://", "postgresql+psycopg://", 1)
    elif raw.startswith("postgresql://") and "+psycopg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw


# Session-scoped engine 
@pytest.fixture(scope="session")
def test_engine():
    engine = create_async_engine(
        _get_test_db_url(),
        echo=False,
        pool_size=2,
        max_overflow=2,
        pool_pre_ping=True,
    )
    return engine


@pytest.fixture(scope="session")
def TestSessionLocal(test_engine):
    return async_sessionmaker(
        bind=test_engine,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
        class_=AsyncSession,
    )


# Create tables once, drop after all tests
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_test_tables(test_engine):
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# Truncate all tables before each test 
@pytest_asyncio.fixture(autouse=True)
async def truncate_tables(test_engine):
    """
    Wipe all rows before every test so each starts with an empty database.
    TRUNCATE ... RESTART IDENTITY CASCADE handles FK constraints and resets sequences.
    """
    table_names = [t.name for t in Base.metadata.sorted_tables]
    if table_names:
        truncate_sql = "TRUNCATE TABLE {} RESTART IDENTITY CASCADE".format(
            ", ".join(table_names)
        )
        async with test_engine.begin() as conn:
            await conn.execute(text(truncate_sql))
    yield


# Per-test DB session 
@pytest_asyncio.fixture
async def db_session(TestSessionLocal) -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


# HTTP test client 
@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """
    AsyncClient whose get_db dependency is overridden to use the test session.
    The truncate_tables fixture ensures a clean DB before each test.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
