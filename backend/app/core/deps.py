"""FastAPI dependency injectors.

Provides reusable dependencies for database sessions, settings,
and tenant context extraction.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi import Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db as _get_db_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session (commits on success, rolls back on error)."""
    async for session in _get_db_session():
        yield session


def get_settings_dep() -> Settings:
    """Return the cached application settings."""
    return get_settings()


async def get_tenant_id(
    x_tenant_id: str | None = Header(None, alias="X-Tenant-ID"),
) -> str | None:
    """Extract tenant ID from the X-Tenant-ID request header.

    Returns None if the header is not present (allows unauthenticated
    access patterns during prototype phase).
    """
    return x_tenant_id
