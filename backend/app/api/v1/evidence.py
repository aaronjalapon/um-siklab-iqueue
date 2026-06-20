"""Cross-subsystem evidence endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.evidence import build_evidence_summary

router = APIRouter()


@router.get("/summary", summary="Get transparent prototype evidence")
async def evidence_summary() -> dict:
    """Return versioned evidence with synthetic-data disclosures."""

    return build_evidence_summary()
