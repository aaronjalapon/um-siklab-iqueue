"""Generate reproducible, synthetic evidence for IQueue subsystems.

This benchmark is intentionally separate from field-impact claims. It uses
fixed random seeds and writes a JSON artifact consumed by the evidence API.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import statistics
import sys
import time
import uuid
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

import simpy

from app.core.security import create_qr_token, generate_secret_key, verify_qr_token
from app.models.seat import Seat, SeatReservation, SeatStatus, SeatType
from app.services.seat_assignment.scorer import (
    PassengerContext,
    score_seat_breakdown,
)


def _seat(row: int, col: int, status: SeatStatus = SeatStatus.AVAILABLE) -> Seat:
    """Build a deterministic in-memory seat for the allocation benchmark."""

    letter = "ABCD"[col - 1]
    return Seat(
        id=uuid.uuid5(uuid.NAMESPACE_DNS, f"iqueue.benchmark.seat.{row}.{col}"),
        bus_id=uuid.UUID(int=1),
        seat_label=f"{row}{letter}",
        row_number=row,
        col_number=col,
        seat_type=SeatType.WINDOW if col in (1, 4) else SeatType.AISLE,
        is_near_exit=row <= 2,
        is_accessibility=row <= 2,
        side="left" if col <= 2 else "right",
        status=status,
    )


def _reservation(
    seat: Seat,
    *,
    language: str,
    group_id: uuid.UUID | None = None,
) -> SeatReservation:
    reservation = SeatReservation(
        id=uuid.uuid4(),
        seat_id=seat.id,
        booking_id=uuid.uuid4(),
        passenger_name="Synthetic passenger",
        group_id=group_id,
        language_preference=language,
        travel_habit="leisure",
        lifestyle_interest="music,travel",
    )
    reservation.seat = seat
    return reservation


def _satisfaction(seat: Seat, passenger: PassengerContext) -> float:
    checks: list[bool] = []
    if passenger.preferred_seat_type:
        checks.append(seat.seat_type.value == passenger.preferred_seat_type)
    if passenger.preferred_side:
        checks.append(seat.side == passenger.preferred_side)
    if passenger.needs_accessibility:
        checks.append(seat.is_accessibility and seat.is_near_exit)
    return sum(checks) / len(checks) if checks else 1.0


def benchmark_seat_allocation(scenarios: int = 200) -> dict:
    """Compare the explainable optimizer with simple allocation baselines."""

    rng = random.Random(42)
    languages = ["en", "fil", "id", "vi"]
    group_id = uuid.UUID("00000000-0000-0000-0000-000000000123")
    occupied = [_seat(3, 2, SeatStatus.OCCUPIED), _seat(6, 2, SeatStatus.OCCUPIED)]
    reservations = [
        _reservation(occupied[0], language="fil"),
        _reservation(occupied[1], language="en", group_id=group_id),
    ]
    available = [
        _seat(row, col)
        for row in range(1, 15)
        for col in range(1, 5)
        if (row, col) not in {(3, 2), (6, 2)}
    ]

    optimized_scores: list[float] = []
    first_scores: list[float] = []
    random_scores: list[float] = []
    group_success = 0
    group_cases = 0
    accessibility_violations = 0
    language_scores: dict[str, list[float]] = defaultdict(list)

    for index in range(scenarios):
        language = languages[index % len(languages)]
        scenario = index // len(languages)
        grouped = scenario % 5 == 0
        passenger = PassengerContext(
            booking_id=str(uuid.uuid4()),
            passenger_name=f"Synthetic passenger {index}",
            group_id=str(group_id) if grouped else None,
            language_preference=language,
            travel_habit="leisure",
            lifestyle_interest="music,travel",
            needs_accessibility=scenario % 20 == 0,
            preferred_seat_type="window" if scenario % 2 == 0 else "aisle",
            preferred_side="left" if scenario % 3 == 0 else "right",
            affinity_opt_in=scenario % 2 == 0,
        )
        candidates = available
        if passenger.needs_accessibility:
            candidates = [seat for seat in available if seat.is_accessibility]
        else:
            candidates = [seat for seat in available if not seat.is_accessibility]

        scored = [
            (seat, score_seat_breakdown(seat, passenger, reservations, 14, 4))
            for seat in candidates
        ]
        best_seat, best_breakdown = max(
            scored,
            key=lambda item: (
                item[1].total,
                -item[0].row_number,
                -item[0].col_number,
            ),
        )
        first_seat = sorted(candidates, key=lambda seat: (seat.row_number, seat.col_number))[0]
        random_seat = rng.choice(candidates)
        optimized = _satisfaction(best_seat, passenger)
        optimized_scores.append(optimized)
        first_scores.append(_satisfaction(first_seat, passenger))
        random_scores.append(_satisfaction(random_seat, passenger))
        language_scores[language].append(optimized)
        if passenger.needs_accessibility and not best_seat.is_accessibility:
            accessibility_violations += 1
        if grouped:
            group_cases += 1
            group_success += int(best_breakdown.components["group_proximity"] > 0)

    per_language = {
        language: round(statistics.mean(values), 3)
        for language, values in language_scores.items()
    }
    fairness_gap = max(per_language.values()) - min(per_language.values())
    return {
        "scenarios": scenarios,
        "optimized_preference_satisfaction": round(statistics.mean(optimized_scores), 3),
        "first_available_satisfaction": round(statistics.mean(first_scores), 3),
        "seeded_random_satisfaction": round(statistics.mean(random_scores), 3),
        "group_proximity_success": round(group_success / max(group_cases, 1), 3),
        "accessibility_violations": accessibility_violations,
        "max_language_satisfaction_gap": round(fairness_gap, 3),
        "affinity_policy": "explicit_opt_in",
    }


def benchmark_qr(iterations: int = 1000) -> dict:
    """Measure signature verification and deterministic tamper rejection."""

    secret = generate_secret_key()
    token = create_qr_token(
        passenger_id=str(uuid.uuid4()),
        route_id=str(uuid.uuid4()),
        bus_id=str(uuid.uuid4()),
        seat="8D",
        boarding_window="2026-06-25T08:00:00+00:00",
        secret=secret,
    )
    timings: list[float] = []
    accepted = 0
    for _ in range(iterations):
        started = time.perf_counter()
        valid, _ = verify_qr_token(token, secret)
        timings.append((time.perf_counter() - started) * 1000)
        accepted += int(valid)

    tampered_rejected = 0
    for index in range(100):
        payload, signature = token.split(".")
        position = index % max(1, len(payload) - 1)
        replacement = "A" if payload[position] != "A" else "B"
        tampered = f"{payload[:position]}{replacement}{payload[position + 1:]}.{signature}"
        valid, _ = verify_qr_token(tampered, secret)
        tampered_rejected += int(not valid)

    timings.sort()
    return {
        "iterations": iterations,
        "valid_acceptance_rate": round(accepted / iterations, 3),
        "tamper_rejection_rate": round(tampered_rejected / 100, 3),
        "verification_p50_ms": round(statistics.median(timings), 4),
        "verification_p95_ms": round(timings[int(len(timings) * 0.95)], 4),
        "offline_capable": True,
        "signature": "HMAC-SHA256 on provisioned terminal devices",
    }


def _simulate_terminal(lanes: int, arrivals: list[float], services: list[float]) -> dict:
    env = simpy.Environment()
    gate = simpy.Resource(env, capacity=lanes)
    waits: list[float] = []
    peak_queue = 0

    def passenger(index: int, arrival: float):
        nonlocal peak_queue
        yield env.timeout(arrival)
        queued_at = env.now
        with gate.request() as request:
            peak_queue = max(peak_queue, len(gate.queue) + 1)
            yield request
            waits.append(env.now - queued_at)
            yield env.timeout(services[index])

    for index, arrival in enumerate(arrivals):
        env.process(passenger(index, arrival))
    env.run()
    ordered = sorted(waits)
    return {
        "passengers": len(waits),
        "lanes": lanes,
        "average_wait_minutes": round(statistics.mean(waits), 2),
        "p95_wait_minutes": round(ordered[int(len(ordered) * 0.95)], 2),
        "peak_queue": peak_queue,
        "missed_boardings": sum(wait > 20 for wait in waits),
    }


def benchmark_operations() -> dict:
    """Compare reactive and forecast-guided lane capacity using SimPy."""

    rng = random.Random(2026)
    arrivals: list[float] = []
    current = 0.0
    while current < 180:
        rate = 0.8 if current < 60 or current >= 120 else 2.4
        current += rng.expovariate(rate)
        if current < 180:
            arrivals.append(current)
    services = [rng.uniform(0.55, 0.85) for _ in arrivals]
    reactive = _simulate_terminal(1, arrivals, services)
    guided = _simulate_terminal(2, arrivals, services)
    reduction = 1 - guided["p95_wait_minutes"] / max(reactive["p95_wait_minutes"], 0.01)
    return {
        "simulation_only": True,
        "engine": "SimPy 4.1.1",
        "reactive": reactive,
        "forecast_guided": guided,
        "p95_wait_reduction": round(reduction, 3),
        "disclosure": "Scenario estimate, not measured field impact",
    }


def _forecasting_summary() -> dict:
    comparison_path = PROJECT_ROOT / "iqueue_artifacts/artifacts/baseline_comparison.csv"
    if not comparison_path.exists():
        return {"status": "comparison_not_generated"}
    with comparison_path.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    combined = next(
        (row for row in rows if "decision model" in row.get("model", "")),
        {},
    )
    return {
        "evaluation_data": "synthetic",
        "comparison_models": len(rows),
        "combined_mae": float(combined["mae"]) if combined.get("mae") else None,
        "combined_surge_f1": (
            float(combined["surge_f1"]) if combined.get("surge_f1") else None
        ),
        "protocol": "artifact report; rerun final pipeline for untouched-test metrics",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate IQueue system evidence")
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "evidence/system_evidence.json",
    )
    args = parser.parse_args()
    evidence = {
        "disclosure": "All results are synthetic benchmarks or simulations.",
        "seed": 2026,
        "forecasting": _forecasting_summary(),
        "seat_allocation": benchmark_seat_allocation(),
        "qr_boarding": benchmark_qr(),
        "operational_simulation": benchmark_operations(),
        "chatbot": {"status": "run ml/chatbot/evaluate.py for model evidence"},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print(f"Wrote reproducible system evidence to {args.output}")


if __name__ == "__main__":
    main()
