"""Scoped, non-production demonstration endpoints."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_db
from app.core.startup import get_forecasting_service
from app.models.forecast_learning import (
    ForecastSnapshot,
    OperationalOutcome,
    OperatorOverride,
)
from app.services.ground_truth import build_ground_truth_records

router = APIRouter()
_REPLAY_WINDOW_SECONDS = 60
_REPLAY_LIMIT = 5
_replay_requests: dict[str, deque[float]] = defaultdict(deque)


def _model_record(instance: object) -> dict:
    """Serialize SQLAlchemy columns for the shared ground-truth builder."""

    table = getattr(instance, "__table__")
    return {column.name: getattr(instance, column.name) for column in table.columns}


def _promotion_gate(
    champion: dict[str, float],
    candidate: dict[str, float],
) -> tuple[bool, list[str]]:
    """Apply the production candidate gate without promoting artifacts."""

    reasons: list[str] = []
    if candidate["avg_surge_f1"] > champion["avg_surge_f1"]:
        reasons.append("surge_f1_improved")
    if candidate["avg_surge_recall"] > champion["avg_surge_recall"]:
        reasons.append("surge_recall_improved")
    mae_allowed = candidate["avg_mae"] <= champion["avg_mae"] * 1.05
    if not mae_allowed:
        reasons.append("mae_regression_over_5_percent")
    improved = any(
        reason in reasons
        for reason in ("surge_f1_improved", "surge_recall_improved")
    )
    return improved and mae_allowed, reasons


@router.post(
    "/retraining-replay",
    summary="Replay the auditable candidate promotion gate",
)
async def replay_retraining(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Replay learning stages with synthetic history and no model mutation."""

    if not get_settings().DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo replay is disabled",
        )

    client_key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    request_times = _replay_requests[client_key]
    while request_times and request_times[0] <= now - _REPLAY_WINDOW_SECONDS:
        request_times.popleft()
    if len(request_times) >= _REPLAY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo replay rate limit exceeded; try again in one minute",
        )
    request_times.append(now)

    snapshot_count = await db.scalar(select(func.count(ForecastSnapshot.id))) or 0
    outcome_count = await db.scalar(select(func.count(OperationalOutcome.id))) or 0
    joined_count = await db.scalar(
        select(func.count(func.distinct(OperationalOutcome.id)))
        .join(
            ForecastSnapshot,
            and_(
                ForecastSnapshot.tenant_id == OperationalOutcome.tenant_id,
                ForecastSnapshot.route_id == OperationalOutcome.route_id,
                ForecastSnapshot.forecast_date == OperationalOutcome.service_date,
            ),
        )
    ) or 0
    snapshots = list((await db.execute(select(ForecastSnapshot))).scalars().all())
    overrides = list((await db.execute(select(OperatorOverride))).scalars().all())
    outcomes = list((await db.execute(select(OperationalOutcome))).scalars().all())
    ground_truth = build_ground_truth_records(
        [_model_record(item) for item in snapshots],
        [_model_record(item) for item in overrides],
        [_model_record(item) for item in outcomes],
    )
    ready_rows = len(ground_truth)
    if ready_rows != joined_count:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ground-truth builder and database join counts disagree",
        )

    service = get_forecasting_service()
    summary = service.metrics_summary if service and service.metrics_summary else {}
    champion = {
        "avg_mae": float(summary.get("avg_mae", 61.33)),
        "avg_surge_f1": float(summary.get("avg_surge_f1", 0.817)),
        "avg_surge_recall": 0.798,
    }
    candidate = {
        "avg_mae": round(champion["avg_mae"] * 0.985, 2),
        "avg_surge_f1": round(champion["avg_surge_f1"] + 0.018, 3),
        "avg_surge_recall": round(champion["avg_surge_recall"] + 0.021, 3),
    }
    passed, reasons = _promotion_gate(champion, candidate)
    enough_rows = ready_rows >= 30

    return {
        "simulated": True,
        "mutated_champion": False,
        "replayed_at": datetime.now(timezone.utc).isoformat(),
        "stages": [
            {"name": "forecast_snapshots", "status": "complete", "rows": snapshot_count},
            {"name": "operational_outcomes", "status": "complete", "rows": outcome_count},
            {
                "name": "ground_truth_builder",
                "status": "complete",
                "rows": ready_rows,
                "feature_count": 22,
                "target_count": 9,
            },
            {
                "name": "minimum_data_gate",
                "status": "passed" if enough_rows else "blocked",
                "required_rows": 30,
            },
            {"name": "candidate_evaluation", "status": "replayed"},
            {
                "name": "promotion_gate",
                "status": "passed" if passed and enough_rows else "rejected",
            },
        ],
        "champion_metrics": champion,
        "candidate_metrics": candidate,
        "decision": "promote" if passed and enough_rows else "retain_champion",
        "reasons": reasons + ([] if enough_rows else ["insufficient_ground_truth_rows"]),
        "disclosure": (
            "This is an auditable replay using deterministic synthetic outcomes; "
            "it does not retrain or replace the deployed model."
        ),
    }
