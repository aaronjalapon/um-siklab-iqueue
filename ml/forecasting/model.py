"""Compatibility wrapper for the forecasting LSTM model.

The canonical runtime implementation now lives in
backend.app.services.forecasting.model so the backend package owns the
production model structure. Training scripts keep importing SurgeLSTM from
this module for backwards compatibility.
"""

from __future__ import annotations

from backend.app.services.forecasting.model import SurgeLSTM

__all__ = ["SurgeLSTM"]
