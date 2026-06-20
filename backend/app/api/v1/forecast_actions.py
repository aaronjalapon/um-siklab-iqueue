"""Operator feedback endpoints for forecast recommendations."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.forecast_learning import (
    ForecastAction,
    ForecastSnapshot,
    OperationalOutcome,
    OperatorOverride,
)
from app.schemas.forecast_learning import (
    ForecastActionCreate,
    ForecastActionResponse,
    LearningLogSummary,
)

router = APIRouter()


@router.post(
    "",
    response_model=ForecastActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record an operator decision for a forecast",
)
async def record_forecast_action(
    payload: ForecastActionCreate,
    db: AsyncSession = Depends(get_db),
) -> OperatorOverride:
    """Store accept/modify/reject feedback for a forecast snapshot."""

    snapshot = await db.get(ForecastSnapshot, payload.forecast_snapshot_id)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecast snapshot {payload.forecast_snapshot_id} not found",
        )
    if snapshot.tenant_id != payload.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forecast snapshot does not belong to this tenant",
        )

    override = OperatorOverride(
        tenant_id=payload.tenant_id,
        route_id=snapshot.route_id,
        forecast_snapshot_id=snapshot.id,
        action_taken=ForecastAction(payload.action_taken),
        override_type=payload.override_type,
        override_reason=payload.override_reason,
        notes=payload.notes,
        operator_id=payload.operator_id,
        final_action=payload.final_action or snapshot.recommended_action,
        decided_at=datetime.now(timezone.utc),
    )
    db.add(override)
    await db.flush()
    await db.refresh(override)
    return override


@router.get(
    "/summary",
    response_model=LearningLogSummary,
    summary="Get continuous-learning log counts",
)
async def get_learning_log_summary(
    tenant_id: UUID = Query(..., description="Tenant/operator UUID"),
    route_id: UUID | None = Query(None, description="Optional route UUID filter"),
    db: AsyncSession = Depends(get_db),
) -> LearningLogSummary:
    """Return counts for the operator dashboard learning-log panel."""

    snapshot_stmt = select(func.count(ForecastSnapshot.id)).where(
        ForecastSnapshot.tenant_id == tenant_id
    )
    action_stmt = select(func.count(OperatorOverride.id)).where(
        OperatorOverride.tenant_id == tenant_id
    )
    outcome_stmt = select(func.count(OperationalOutcome.id)).where(
        OperationalOutcome.tenant_id == tenant_id
    )
    ready_stmt = (
        select(func.count(func.distinct(OperationalOutcome.id)))
        .join(
            ForecastSnapshot,
            (ForecastSnapshot.tenant_id == OperationalOutcome.tenant_id)
            & (ForecastSnapshot.route_id == OperationalOutcome.route_id)
            & (ForecastSnapshot.forecast_date == OperationalOutcome.service_date),
        )
        .where(OperationalOutcome.tenant_id == tenant_id)
    )
    latest_stmt = select(func.max(OperationalOutcome.service_date)).where(
        OperationalOutcome.tenant_id == tenant_id
    )

    if route_id:
        snapshot_stmt = snapshot_stmt.where(ForecastSnapshot.route_id == route_id)
        action_stmt = action_stmt.where(OperatorOverride.route_id == route_id)
        outcome_stmt = outcome_stmt.where(OperationalOutcome.route_id == route_id)
        ready_stmt = ready_stmt.where(OperationalOutcome.route_id == route_id)
        latest_stmt = latest_stmt.where(OperationalOutcome.route_id == route_id)

    return LearningLogSummary(
        tenant_id=tenant_id,
        route_id=route_id,
        forecast_snapshots=await db.scalar(snapshot_stmt) or 0,
        operator_actions=await db.scalar(action_stmt) or 0,
        operational_outcomes=await db.scalar(outcome_stmt) or 0,
        ground_truth_ready_rows=await db.scalar(ready_stmt) or 0,
        latest_outcome_date=await db.scalar(latest_stmt),
    )
