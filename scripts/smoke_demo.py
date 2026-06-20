#!/usr/bin/env python3
"""Smoke-test the deployed IQueue judge path with concise provenance output."""

from __future__ import annotations

import argparse
import json
import time
from typing import Any
from urllib.request import Request, urlopen

DEMO_ROUTE_ID = "26fd7e27-4920-510b-ae57-9424533347da"


def call(base_url: str, method: str, path: str, payload: dict | None = None) -> tuple[Any, float]:
    """Call one JSON endpoint and return its payload and latency in ms."""

    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(
        f"{base_url.rstrip('/')}{path}",
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    started = time.perf_counter()
    with urlopen(request, timeout=30) as response:
        result = json.load(response)
    return result, (time.perf_counter() - started) * 1000


def main() -> None:
    """Run readiness, ML, chatbot, evidence, and optional replay checks."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000/api/v1",
    )
    parser.add_argument("--skip-replay", action="store_true")
    args = parser.parse_args()

    readiness, latency = call(args.base_url, "GET", "/health/readiness")
    assert readiness["ready"] and len(readiness["loaded_routes"]) == 6
    print(f"readiness: ok ({latency:.1f} ms)")

    forecast, latency = call(
        args.base_url,
        "GET",
        f"/forecasts/{DEMO_ROUTE_ID}",
    )
    assert forecast["model_source"] == "ml_bundle"
    assert len(forecast["predictions"]) == 7
    print(
        "forecast: ml_bundle "
        f"{forecast['model_version']} ({latency:.1f} ms)"
    )

    chatbot, latency = call(
        args.base_url,
        "POST",
        "/chatbot/message",
        {"query": "Mataas ba ang surge bukas?", "language": "fil"},
    )
    assert chatbot["intent"] == "surge_info"
    print(f"chatbot: surge_info/{chatbot['detected_language']} ({latency:.1f} ms)")

    evidence, latency = call(args.base_url, "GET", "/evidence/summary")
    assert evidence["data_disclosure"]["data_type"] == "synthetic"
    assert evidence["subsystems"]["qr_boarding"]
    print(f"evidence: transparent synthetic disclosure ({latency:.1f} ms)")

    if not args.skip_replay:
        replay, latency = call(
            args.base_url,
            "POST",
            "/demo/retraining-replay",
        )
        assert replay["simulated"] and not replay["mutated_champion"]
        print(
            f"retraining replay: {replay['decision']} with "
            f"{replay['stages'][2]['rows']} rows ({latency:.1f} ms)"
        )


if __name__ == "__main__":
    main()
