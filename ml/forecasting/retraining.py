"""Continuous retraining gate for IQueue forecasting bundles."""

from __future__ import annotations

import argparse
import json
import shlex
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


def _load_metrics(path: Path) -> dict:
    """Load route metrics and compute average champion/candidate scores."""

    data = json.loads(path.read_text(encoding="utf-8"))
    route_metrics = [v for v in data.values() if isinstance(v, dict)]
    if not route_metrics:
        raise ValueError(f"No route metrics found in {path}")
    return {
        "avg_mae": sum(float(m.get("mae", 0)) for m in route_metrics) / len(route_metrics),
        "avg_surge_f1": sum(float(m.get("surge_f1", 0)) for m in route_metrics) / len(route_metrics),
        "avg_surge_recall": sum(float(m.get("surge_recall", 0)) for m in route_metrics)
        / len(route_metrics),
        "routes_evaluated": len(route_metrics),
    }


def should_retrain(
    ground_truth_path: Path,
    min_new_rows: int = 30,
) -> tuple[bool, int]:
    """Return whether enough validated ground-truth rows exist."""

    if not ground_truth_path.exists():
        return False, 0
    rows = len(pd.read_csv(ground_truth_path))
    return rows >= min_new_rows, rows


def candidate_passes_gate(
    champion_metrics: dict,
    candidate_metrics: dict,
    mae_ceiling_multiplier: float = 1.05,
) -> tuple[bool, list[str]]:
    """Decide whether a candidate bundle should become the champion."""

    reasons: list[str] = []
    f1_improved = candidate_metrics["avg_surge_f1"] > champion_metrics["avg_surge_f1"]
    recall_improved = (
        candidate_metrics["avg_surge_recall"] > champion_metrics["avg_surge_recall"]
    )
    mae_allowed = (
        candidate_metrics["avg_mae"]
        <= champion_metrics["avg_mae"] * mae_ceiling_multiplier
    )

    if f1_improved:
        reasons.append("surge_f1_improved")
    if recall_improved:
        reasons.append("surge_recall_improved")
    if not mae_allowed:
        reasons.append("mae_regression_over_5_percent")

    return (f1_improved or recall_improved) and mae_allowed, reasons


def promote_candidate(
    champion_dir: Path,
    candidate_dir: Path,
    archive_dir: Path,
    decision: dict,
) -> Path:
    """Archive current champion and promote the candidate bundle."""

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive_dir.mkdir(parents=True, exist_ok=True)
    archived_champion = archive_dir / f"champion_{timestamp}"

    if champion_dir.exists():
        shutil.copytree(champion_dir, archived_champion)
    if champion_dir.exists():
        shutil.rmtree(champion_dir)
    shutil.copytree(candidate_dir, champion_dir)

    decision_path = champion_dir / "promotion_decision.json"
    decision_path.write_text(json.dumps(decision, indent=2), encoding="utf-8")
    return archived_champion


def run_training_command(command: str, candidate_dir: Path) -> None:
    """Run the configured training command for a candidate bundle."""

    candidate_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(shlex.split(command), check=True)


def main() -> None:
    """CLI entry point for scheduled retraining checks."""

    parser = argparse.ArgumentParser(description="Gate IQueue model retraining")
    parser.add_argument(
        "--ground-truth",
        type=Path,
        default=Path("ml/forecasting/data/cleaned/ground_truth_route_days.csv"),
    )
    parser.add_argument("--champion-dir", type=Path, required=True)
    parser.add_argument("--candidate-dir", type=Path, required=True)
    parser.add_argument("--archive-dir", type=Path, default=Path("ml/forecasting/model_archive"))
    parser.add_argument("--min-new-rows", type=int, default=30)
    parser.add_argument("--train-command", type=str, default="")
    parser.add_argument("--promote", action="store_true")
    args = parser.parse_args()

    ready, row_count = should_retrain(args.ground_truth, args.min_new_rows)
    if not ready:
        print(
            f"Retraining skipped: {row_count} ground-truth rows "
            f"(< {args.min_new_rows} required)"
        )
        return

    if args.train_command:
        run_training_command(args.train_command, args.candidate_dir)

    champion_metrics = _load_metrics(args.champion_dir / "eval_summary.json")
    candidate_metrics = _load_metrics(args.candidate_dir / "eval_summary.json")
    passed, reasons = candidate_passes_gate(champion_metrics, candidate_metrics)

    decision = {
        "decided_at": datetime.now(timezone.utc).isoformat(),
        "passed": passed,
        "reasons": reasons,
        "ground_truth_rows": row_count,
        "champion_metrics": champion_metrics,
        "candidate_metrics": candidate_metrics,
    }

    if passed and args.promote:
        archived = promote_candidate(
            args.champion_dir,
            args.candidate_dir,
            args.archive_dir,
            decision,
        )
        print(f"Candidate promoted. Previous champion archived at {archived}")
    else:
        decision_path = args.candidate_dir / "promotion_decision.json"
        decision_path.write_text(json.dumps(decision, indent=2), encoding="utf-8")
        print(f"Candidate {'passed' if passed else 'rejected'} gate: {reasons}")


if __name__ == "__main__":
    main()
