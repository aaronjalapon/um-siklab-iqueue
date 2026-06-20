"""Async-compatible retraining orchestration service for IQueue.

Manages the full champion/candidate lifecycle:
  1. Checks ground-truth row sufficiency
  2. Spawns train.py as a subprocess (candidate bundle)
  3. Runs the promotion gate (retraining.py logic inlined for import-safety)
  4. On pass: promotes candidate → champion, hot-reloads ForecastingService
  5. Writes job status so the API can poll progress

The service is intentionally stateless between requests — only the in-memory
job store (_JOBS) persists within a single server process lifetime.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pandas as pd

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory job store  (survives the process lifetime, not across restarts)
# ---------------------------------------------------------------------------

_JOBS: dict[str, dict[str, Any]] = {}


def get_job(job_id: str) -> dict[str, Any] | None:
    """Return the current status dict for a retraining job."""
    return _JOBS.get(job_id)


def list_jobs(limit: int = 10) -> list[dict[str, Any]]:
    """Return the most recent jobs in reverse chronological order."""
    return sorted(
        _JOBS.values(),
        key=lambda j: j.get("started_at", ""),
        reverse=True,
    )[:limit]


# ---------------------------------------------------------------------------
# Helpers (mirror retraining.py without importing it to avoid circular deps)
# ---------------------------------------------------------------------------

def _load_eval_summary(path: Path) -> dict[str, Any]:
    """Load eval_summary.json and compute aggregate champion/candidate scores."""
    data = json.loads(path.read_text(encoding="utf-8"))
    route_metrics = [v for v in data.values() if isinstance(v, dict)]
    if not route_metrics:
        raise ValueError(f"No route metrics found in {path}")
    return {
        "avg_mae": sum(float(m.get("mae", 0)) for m in route_metrics) / len(route_metrics),
        "avg_surge_f1": sum(float(m.get("surge_f1", 0)) for m in route_metrics) / len(route_metrics),
        "avg_surge_recall": sum(float(m.get("surge_recall", 0)) for m in route_metrics) / len(route_metrics),
        "routes_evaluated": len(route_metrics),
    }


def _ground_truth_row_count(ground_truth_path: Path) -> int:
    """Return the number of rows in the ground-truth CSV, or 0 if absent."""
    if not ground_truth_path.exists():
        return 0
    return len(pd.read_csv(ground_truth_path))


def _candidate_passes_gate(
    champion: dict[str, Any],
    candidate: dict[str, Any],
    mae_ceiling_multiplier: float = 1.05,
) -> tuple[bool, list[str]]:
    """Return (passed, reasons) for the promotion gate."""
    reasons: list[str] = []
    f1_improved = candidate["avg_surge_f1"] > champion["avg_surge_f1"]
    recall_improved = candidate["avg_surge_recall"] > champion["avg_surge_recall"]
    mae_allowed = candidate["avg_mae"] <= champion["avg_mae"] * mae_ceiling_multiplier

    if f1_improved:
        reasons.append("surge_f1_improved")
    if recall_improved:
        reasons.append("surge_recall_improved")
    if not mae_allowed:
        reasons.append("mae_regression_over_5_percent")

    return (f1_improved or recall_improved) and mae_allowed, reasons


def _promote(
    champion_dir: Path,
    candidate_dir: Path,
    archive_dir: Path,
    decision: dict[str, Any],
) -> Path:
    """Archive champion and copy candidate into the champion slot."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive_dir.mkdir(parents=True, exist_ok=True)
    archived = archive_dir / f"champion_{timestamp}"

    if champion_dir.exists():
        shutil.copytree(champion_dir, archived)
        shutil.rmtree(champion_dir)
    shutil.copytree(candidate_dir, champion_dir)

    (champion_dir / "promotion_decision.json").write_text(
        json.dumps(decision, indent=2), encoding="utf-8"
    )
    return archived


# ---------------------------------------------------------------------------
# Main async orchestrator
# ---------------------------------------------------------------------------

async def run_retraining_job(
    job_id: str,
    *,
    epochs: int,
    min_new_rows: int,
    project_root: Path,
    champion_dir: Path,
    candidate_dir: Path,
    archive_dir: Path,
    ground_truth_path: Path,
) -> None:
    """Full async retraining pipeline executed in the background."""

    job = _JOBS[job_id]

    def _update(**kwargs: Any) -> None:
        job.update(kwargs)
        logger.info("Retraining job %s: %s", job_id, kwargs)

    _update(status="checking_data")

    # --- Step 1: data sufficiency ---
    row_count = _ground_truth_row_count(ground_truth_path)
    if row_count < min_new_rows:
        _update(
            status="skipped",
            message=f"Only {row_count} ground-truth rows (need ≥{min_new_rows})",
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        return

    _update(status="training", ground_truth_rows=row_count)

    # --- Step 2: train candidate ---
    candidate_dir.mkdir(parents=True, exist_ok=True)
    train_cmd = [
        sys.executable,  # same Python/venv that FastAPI is running on
        str(project_root / "ml/forecasting/train.py"),
        "--epochs", str(epochs),
        "--artifacts", str(candidate_dir),
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *train_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(project_root),
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            raise subprocess.CalledProcessError(proc.returncode, train_cmd, stdout)
        _update(training_output=stdout.decode(errors="replace")[-2000:])
    except Exception as exc:
        _update(
            status="failed",
            error=str(exc),
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        return

    # --- Step 3: evaluation gate ---
    _update(status="evaluating")
    try:
        champion_eval = champion_dir / "eval_summary.json"
        candidate_eval = candidate_dir / "eval_summary.json"

        if not champion_eval.exists():
            # No champion yet → promote unconditionally
            passed, reasons = True, ["no_existing_champion"]
        else:
            champion_metrics = _load_eval_summary(champion_eval)
            candidate_metrics = _load_eval_summary(candidate_eval)
            passed, reasons = _candidate_passes_gate(champion_metrics, candidate_metrics)

        candidate_metrics_summary = _load_eval_summary(candidate_eval)
        champion_metrics_summary = (
            _load_eval_summary(champion_eval) if champion_eval.exists() else {}
        )

        decision = {
            "decided_at": datetime.now(timezone.utc).isoformat(),
            "passed": passed,
            "reasons": reasons,
            "ground_truth_rows": row_count,
            "champion_metrics": champion_metrics_summary,
            "candidate_metrics": candidate_metrics_summary,
        }
    except Exception as exc:
        _update(
            status="failed",
            error=f"Evaluation gate error: {exc}",
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        return

    # --- Step 4: promote or reject ---
    if passed:
        _update(status="promoting")
        try:
            archived_path = _promote(champion_dir, candidate_dir, archive_dir, decision)
            _update(
                status="promoted",
                decision=decision,
                archived_champion=str(archived_path),
                finished_at=datetime.now(timezone.utc).isoformat(),
            )
            # Hot-reload the live ForecastingService
            _hot_reload_forecasting_service()
        except Exception as exc:
            _update(
                status="failed",
                error=f"Promotion failed: {exc}",
                finished_at=datetime.now(timezone.utc).isoformat(),
            )
    else:
        (candidate_dir / "promotion_decision.json").write_text(
            json.dumps(decision, indent=2), encoding="utf-8"
        )
        _update(
            status="rejected",
            decision=decision,
            message=f"Candidate did not pass gate: {reasons}",
            finished_at=datetime.now(timezone.utc).isoformat(),
        )


def _hot_reload_forecasting_service() -> None:
    """Reset and re-initialize the ForecastingService singleton from disk."""
    try:
        from app.core.startup import reload_forecasting_service
        reload_forecasting_service()
        logger.info("ForecastingService hot-reloaded after promotion")
    except Exception as exc:
        logger.warning("Hot-reload failed (service will pick up new model on next restart): %s", exc)


# ---------------------------------------------------------------------------
# Public trigger function
# ---------------------------------------------------------------------------

def trigger_retraining(
    epochs: int = 80,
    min_new_rows: int = 30,
) -> str:
    """Create a job entry and return its ID.

    The caller is responsible for scheduling run_retraining_job() as an
    asyncio background task.

    Project root resolution:
    - In Docker the WORKDIR is /app and both ./ml and ./iqueue_artifacts are
      bind-mounted there, so project root = /app.
    - Outside Docker the root is derived from FORECASTING_ARTIFACTS_DIR
      (iqueue_artifacts/ lives one level below project root).
    """
    import os

    settings = get_settings()
    champion_dir = Path(settings.FORECASTING_ARTIFACTS_DIR)

    # /app/iqueue_artifacts/artifacts → /app is the project root inside Docker.
    # On the host: <project>/iqueue_artifacts/artifacts → <project> is root.
    project_root = champion_dir.parents[1]

    # Allow an explicit override via env (useful for unusual mount layouts)
    project_root_override = os.environ.get("IQUEUE_PROJECT_ROOT")
    if project_root_override:
        project_root = Path(project_root_override)

    candidate_dir = champion_dir.parent / "candidate"
    archive_dir = champion_dir.parent / "model_archive"
    ground_truth_path = (
        project_root / "ml/forecasting/data/cleaned/ground_truth_route_days.csv"
    )

    job_id = str(uuid4())
    _JOBS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "epochs": epochs,
        "min_new_rows": min_new_rows,
        "champion_dir": str(champion_dir),
        "candidate_dir": str(candidate_dir),
        "ground_truth_path": str(ground_truth_path),
    }

    _JOBS[job_id]["_task_kwargs"] = {
        "epochs": epochs,
        "min_new_rows": min_new_rows,
        "project_root": project_root,
        "champion_dir": champion_dir,
        "candidate_dir": candidate_dir,
        "archive_dir": archive_dir,
        "ground_truth_path": ground_truth_path,
    }

    return job_id
