"""Passenger route handlers — create, find, and manage passenger profiles."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.passenger import Passenger
from app.schemas.passenger import PassengerCreate, PassengerResponse

router = APIRouter()


@router.post(
    "",
    response_model=PassengerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or find a passenger",
)
async def create_or_find_passenger(
    payload: PassengerCreate,
    db: AsyncSession = Depends(get_db),
) -> Passenger:
    """Create a new passenger or return an existing one by phone number.

    If a passenger with the given phone already exists, their profile
    is updated with the latest preferences and returned (upsert).
    Otherwise a new Passenger record is created.
    """
    # Try to find existing passenger by phone
    result = await db.execute(
        select(Passenger).where(Passenger.phone == payload.phone)
    )
    existing = result.scalars().first()

    if existing:
        # Update preferences with latest values
        existing.name = payload.name
        existing.language_pref = payload.language_pref
        if payload.travel_habits is not None:
            existing.travel_habits = payload.travel_habits
        if payload.lifestyle_interests is not None:
            existing.lifestyle_interests = payload.lifestyle_interests
        existing.accessibility_needs = payload.accessibility_needs
        await db.flush()
        await db.refresh(existing)
        return existing

    # Resolve tenant — use existing tenant if the provided one doesn't exist
    from app.models.tenant import Tenant
    tenant = await db.get(Tenant, payload.tenant_id)
    if not tenant:
        # Fall back to the first available tenant (demo/dev mode)
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalars().first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tenants configured",
            )

    # Create new passenger
    passenger = Passenger(
        tenant_id=tenant.id,
        name=payload.name,
        phone=payload.phone,
        language_pref=payload.language_pref,
        travel_habits=payload.travel_habits,
        lifestyle_interests=payload.lifestyle_interests,
        accessibility_needs=payload.accessibility_needs,
    )
    db.add(passenger)
    await db.flush()
    await db.refresh(passenger)
    return passenger


@router.get(
    "/{passenger_id}",
    response_model=PassengerResponse,
    summary="Get passenger profile",
)
async def get_passenger(
    passenger_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Passenger:
    """Retrieve a passenger by ID."""
    passenger = await db.get(Passenger, passenger_id)
    if not passenger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Passenger {passenger_id} not found",
        )
    return passenger
