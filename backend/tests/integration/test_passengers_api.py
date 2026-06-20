"""Passenger API tenant-isolation tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.passenger import Passenger
from app.models.tenant import Tenant


@pytest.mark.asyncio
async def test_passenger_phone_upsert_is_tenant_scoped(
    client: AsyncClient,
    db_session,
    tenant,
) -> None:
    """The same phone may identify different passengers across operators."""

    other_tenant = Tenant(name="Other Passenger Operator", country="PH")
    db_session.add(other_tenant)
    await db_session.flush()
    db_session.add(
        Passenger(
            tenant_id=other_tenant.id,
            name="Other Maria",
            phone="+639171111111",
            language_pref="en",
            accessibility_needs=False,
        )
    )
    await db_session.flush()

    response = await client.post(
        "/api/v1/passengers",
        json={
            "tenant_id": str(tenant.id),
            "name": "Tenant Maria",
            "phone": "+639171111111",
            "language_pref": "fil",
            "accessibility_needs": False,
        },
    )

    assert response.status_code == 201
    assert response.json()["tenant_id"] == str(tenant.id)


@pytest.mark.asyncio
async def test_passenger_rejects_unknown_tenant(client: AsyncClient) -> None:
    """Passenger creation must not silently fall back across tenants."""

    response = await client.post(
        "/api/v1/passengers",
        json={
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "name": "Unknown Tenant Passenger",
            "phone": "+639171222222",
            "language_pref": "en",
            "accessibility_needs": False,
        },
    )

    assert response.status_code == 404
