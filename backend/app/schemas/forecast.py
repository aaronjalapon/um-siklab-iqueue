"""Forecast schemas — request/response models for the forecasts API."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class SurgePrediction(BaseModel):
    """A single day's surge forecast for a route."""

    forecast_snapshot_id: UUID | None = Field(
        None, description="Stored snapshot ID for operator feedback"
    )
    forecast_date: date = Field(..., description="The forecasted date")
    surge_probability: float = Field(
        ..., ge=0.0, le=1.0, description="Probability of a surge event (0-1)"
    )
    predicted_volume: int = Field(
        ..., ge=0, description="Predicted passenger count"
    )
    confidence_lower: int | None = Field(
        None, description="Lower bound of prediction interval"
    )
    confidence_upper: int | None = Field(
        None, description="Upper bound of prediction interval"
    )
    is_holiday: bool = Field(
        False, description="Whether this date falls on an ASEAN holiday"
    )
    holiday_name: str | None = Field(
        None, description="Name of the holiday if applicable"
    )
    risk_level: str = Field(
        "low", description="Operational risk level: low, moderate, high, critical"
    )
    recommended_action: str = Field(
        "Continue normal boarding operations",
        description="Recommended terminal action for this forecast",
    )
    model_confidence: float | None = Field(
        None, ge=0.0, le=1.0, description="Heuristic confidence score for this output"
    )


class ForecastResponse(BaseModel):
    """7-day surge forecast for a bus route."""

    route_id: UUID
    route_origin: str = ""
    route_destination: str = ""
    generated_at: date = Field(..., description="Date when the forecast was generated")
    model_source: str = Field(
        "heuristic", description="Forecast source: ml_bundle or heuristic"
    )
    model_version: str | None = Field(
        None, description="Model bundle or ruleset version used for this response"
    )
    metrics_summary: dict | None = Field(
        None, description="Optional model metrics summary from the active bundle"
    )
    predictions: list[SurgePrediction] = Field(
        ..., description="Daily predictions for the next 7 days"
    )
