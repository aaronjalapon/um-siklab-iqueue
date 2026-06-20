"""Operational outcome endpoints for ground-truth capture."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.bus_route import BusRoute
from app.models.forecast_learning import OperationalOutcome
from app.schemas.forecast_learning import (
    OperationalOutcomeCreate,
    OperationalOutcomeResponse,
)

router = APIRouter()


@router.post(
    "/outcomes",
    response_model=OperationalOutcomeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record end-of-day route operations",
)
async def record_operational_outcome(
    payload: OperationalOutcomeCreate,
    db: AsyncSession = Depends(get_db),
) -> OperationalOutcome:
    """Create or update actual route-day outcomes for future retraining."""

    route = await db.get(BusRoute, payload.route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route {payload.route_id} not found",
        )
    if route.tenant_id != payload.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Route does not belong to this tenant",
        )

    existing = await db.scalar(
        select(OperationalOutcome).where(
            OperationalOutcome.tenant_id == payload.tenant_id,
            OperationalOutcome.route_id == payload.route_id,
            OperationalOutcome.service_date == payload.service_date,
        )
    )

    values = payload.model_dump()
    if existing:
        for key, value in values.items():
            setattr(existing, key, value)
        outcome = existing
    else:
        outcome = OperationalOutcome(**values)
        db.add(outcome)

    await db.flush()
    await db.refresh(outcome)
    return outcome
