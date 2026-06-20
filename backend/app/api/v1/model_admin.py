"""Model administration endpoints — retraining gate and hot-reload.

Routes (all under /api/v1/forecasts/model/):
  POST /retrain        Trigger async retraining job
  GET  /retrain/status Get status of the latest (or specific) retraining job
  GET  /retrain/jobs   List recent retraining jobs
  POST /reload         Hot-reload artifacts without retraining
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.retraining import (
    get_job,
    list_jobs,
    run_retraining_job,
    trigger_retraining,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RetrainRequest(BaseModel):
    """Parameters for a retraining job."""

    epochs: int = Field(default=80, ge=1, le=300, description="LSTM training epochs")
    min_new_rows: int = Field(
        default=30, ge=1, description="Minimum ground-truth rows to trigger retraining"
    )


class RetrainJobResponse(BaseModel):
    """Immediate response returned when a retraining job is queued."""

    job_id: str
    status: str
    message: str


class RetrainStatusResponse(BaseModel):
    """Full status snapshot for a retraining job."""

    job_id: str
    status: str
    started_at: str | None = None
    finished_at: str | None = None
    ground_truth_rows: int | None = None
    decision: dict[str, Any] | None = None
    archived_champion: str | None = None
    message: str | None = None
    error: str | None = None
    epochs: int | None = None


# ---------------------------------------------------------------------------
# Background task launcher
# ---------------------------------------------------------------------------


async def _launch_retraining_task(job_id: str, task_kwargs: dict) -> None:
    """Wrap run_retraining_job so BackgroundTasks can call it."""
    await run_retraining_job(job_id, **task_kwargs)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/retrain",
    response_model=RetrainJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger async model retraining",
    description=(
        "Queues a full retraining cycle in the background:\n"
        "1. Checks ground-truth row count\n"
        "2. Trains a candidate bundle with train.py\n"
        "3. Evaluates the promotion gate\n"
        "4. Promotes candidate → champion on pass (hot-swaps live service)\n\n"
        "Poll `GET /retrain/status?job_id=<id>` to track progress."
    ),
)
async def trigger_retrain(
    payload: RetrainRequest,
    background_tasks: BackgroundTasks,
) -> RetrainJobResponse:
    """Queue a retraining job and return the job_id immediately."""

    # Reject if another job is already running
    running = [j for j in list_jobs() if j.get("status") in ("queued", "training", "evaluating", "promoting")]
    if running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Retraining job {running[0]['job_id']} is already running (status: {running[0]['status']}). "
                   "Wait for it to complete before starting another.",
        )

    job_id = trigger_retraining(
        epochs=payload.epochs,
        min_new_rows=payload.min_new_rows,
    )
    job = get_job(job_id)
    task_kwargs = job.pop("_task_kwargs")  # type: ignore[union-attr]

    background_tasks.add_task(_launch_retraining_task, job_id, task_kwargs)
    logger.info("Retraining job %s queued (epochs=%d)", job_id, payload.epochs)

    return RetrainJobResponse(
        job_id=job_id,
        status="queued",
        message=(
            f"Retraining job queued. Poll GET /api/v1/forecasts/model/retrain/status?job_id={job_id}"
        ),
    )


@router.get(
    "/retrain/status",
    response_model=RetrainStatusResponse,
    summary="Poll retraining job status",
)
async def get_retrain_status(
    job_id: str | None = Query(None, description="Job ID from POST /retrain. Omit to get the latest job."),
) -> RetrainStatusResponse:
    """Return the current status of a retraining job."""

    if job_id:
        job = get_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No retraining job with id={job_id}",
            )
    else:
        jobs = list_jobs(limit=1)
        if not jobs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No retraining jobs have been run yet. POST /retrain to start one.",
            )
        job = jobs[0]

    return RetrainStatusResponse(
        job_id=job["job_id"],
        status=job.get("status", "unknown"),
        started_at=job.get("started_at"),
        finished_at=job.get("finished_at"),
        ground_truth_rows=job.get("ground_truth_rows"),
        decision=job.get("decision"),
        archived_champion=job.get("archived_champion"),
        message=job.get("message"),
        error=job.get("error"),
        epochs=job.get("epochs"),
    )


@router.get(
    "/retrain/jobs",
    summary="List recent retraining jobs",
)
async def list_retrain_jobs(
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict]:
    """Return the most recent retraining job summaries."""
    return [
        {k: v for k, v in job.items() if not k.startswith("_")}
        for job in list_jobs(limit=limit)
    ]


@router.post(
    "/reload",
    summary="Hot-reload model artifacts from disk",
    description=(
        "Resets and re-initializes the ForecastingService singleton from the "
        "artifact directory on disk. Use this after manually copying new model "
        "files without running a full retraining cycle."
    ),
)
async def reload_model() -> dict[str, Any]:
    """Hot-reload the ForecastingService without retraining."""
    try:
        from app.core.startup import reload_forecasting_service, runtime_snapshot
        service = reload_forecasting_service()
        snapshot = runtime_snapshot()
        return {
            "message": "ForecastingService reloaded successfully",
            "model_version": snapshot.get("model_version"),
            "bundle_status": snapshot.get("forecast_bundle_status"),
            "loaded_routes": snapshot.get("loaded_routes", []),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hot-reload failed: {exc}",
        ) from exc
