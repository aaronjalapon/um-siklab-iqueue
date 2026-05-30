"""Shared pytest fixtures for IQueue backend tests.

Provides async database sessions, test HTTP client, and sample
test data (tenant, route, bus, passenger, booking).
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.base import Base
from app.main import app
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.models.passenger import Passenger
from app.models.tenant import Tenant

# Use an in-memory SQLite database for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///file:iqueue_test?mode=memory&cache=shared&uri=true"


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create the test database engine and schema."""
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP test client."""
    transport = ASGITransport(app=app)

    # Override the get_db dependency to use test session
    from app.core.deps import get_db as original_get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[original_get_db] = override_get_db

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# --- Sample data fixtures ---

@pytest_asyncio.fixture
async def tenant(db_session: AsyncSession):
    """Create a sample tenant."""
    t = Tenant(
        id=uuid.uuid4(),
        name="Test Operator PH",
        country="PH",
    )
    db_session.add(t)
    await db_session.flush()
    return t


@pytest_asyncio.fixture
async def route(db_session: AsyncSession, tenant):
    """Create a sample bus route."""
    r = BusRoute(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        origin="Manila",
        destination="Davao",
        distance_km=968.0,
    )
    db_session.add(r)
    await db_session.flush()
    return r


@pytest_asyncio.fixture
async def bus(db_session: AsyncSession, tenant, route):
    """Create a sample bus."""
    b = Bus(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        route_id=route.id,
        capacity=50,
        plate_number="PH-0001",
    )
    db_session.add(b)
    await db_session.flush()
    return b


@pytest_asyncio.fixture
async def passenger(db_session: AsyncSession, tenant):
    """Create a sample passenger."""
    p = Passenger(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="Juan Dela Cruz",
        phone="+63 912 345 6789",
        language_pref="fil",
        travel_habits="leisure",
        lifestyle_interests="sports,music,travel",
        accessibility_needs=False,
    )
    db_session.add(p)
    await db_session.flush()
    return p


@pytest_asyncio.fixture
async def booking(db_session: AsyncSession, passenger, bus):
    """Create a sample confirmed booking."""
    departure = datetime.now(timezone.utc) + timedelta(days=3)
    b = Booking(
        id=uuid.uuid4(),
        passenger_id=passenger.id,
        bus_id=bus.id,
        seat_number="5A",
        boarding_window_start=departure + timedelta(minutes=15),
        boarding_window_end=departure + timedelta(minutes=30),
        status=BookingStatus.CONFIRMED,
        departure_date=departure,
    )
    db_session.add(b)
    await db_session.flush()
    return b
