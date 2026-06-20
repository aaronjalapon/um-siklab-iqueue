"""Leakage-safe chronological split helpers for route time series."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True, slots=True)
class ChronologicalSplit:
    """Non-overlapping train, validation, and untouched test windows."""

    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame


def chronological_split(
    frame: pd.DataFrame,
    train_fraction: float = 0.70,
    validation_fraction: float = 0.15,
) -> ChronologicalSplit:
    """Split an ordered route frame without shuffling or date overlap."""

    if not 0 < train_fraction < 1:
        raise ValueError("train_fraction must be between 0 and 1")
    if not 0 < validation_fraction < 1 - train_fraction:
        raise ValueError("validation_fraction leaves no test partition")
    ordered = frame.sort_values("date").reset_index(drop=True)
    if len(ordered) < 30:
        raise ValueError("At least 30 route-day rows are required")
    train_end = int(len(ordered) * train_fraction)
    validation_end = int(
        len(ordered) * (train_fraction + validation_fraction)
    )
    split = ChronologicalSplit(
        train=ordered.iloc[:train_end].copy(),
        validation=ordered.iloc[train_end:validation_end].copy(),
        test=ordered.iloc[validation_end:].copy(),
    )
    if not (
        split.train["date"].max() < split.validation["date"].min()
        and split.validation["date"].max() < split.test["date"].min()
    ):
        raise ValueError("Chronological partitions overlap")
    return split
