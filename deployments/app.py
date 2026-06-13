"""Standalone chatbot inference service for Azure deployment."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import json
import os
from typing import Any

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_PATH = Path(
    os.getenv(
        "CHATBOT_MODEL_PATH",
        Path(__file__).resolve().parent / "xlm-roberta-iqueue",
    )
)
MODEL_MAX_LENGTH = int(os.getenv("CHATBOT_MAX_LENGTH", "128"))


class InputText(BaseModel):
    """Request body for the prediction endpoint."""

    text: str = Field(..., min_length=1, max_length=500)


def load_model() -> tuple[Any, Any, dict[int, str]]:
    """Load the tokenizer, classifier, and intent map from disk."""

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model directory not found: {MODEL_PATH}")

    config_path = MODEL_PATH / "config.json"
    label_map_path = MODEL_PATH / "label_map.json"

    if not config_path.exists():
        raise FileNotFoundError(f"Missing model config: {config_path}")

    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH))
    model.eval()

    if label_map_path.exists():
        with label_map_path.open() as file:
            label_map = json.load(file)
        id2label = {int(key): value for key, value in label_map.items()}
    else:
        id2label = {
            0: "check_booking",
            1: "request_requeue",
            2: "get_departure_info",
            3: "surge_info",
            4: "fallback",
        }

    return tokenizer, model, id2label


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload the model during startup so Azure reports readiness correctly."""

    try:
        tokenizer, model, id2label = load_model()
        app.state.tokenizer = tokenizer
        app.state.model = model
        app.state.id2label = id2label
        app.state.model_ready = True
        app.state.model_error = None
    except Exception as exc:  # pragma: no cover - startup failure path
        app.state.tokenizer = None
        app.state.model = None
        app.state.id2label = {}
        app.state.model_ready = False
        app.state.model_error = str(exc)

    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, object]:
    """Return readiness information for Azure health probes."""

    return {
        "status": "ok" if app.state.model_ready else "degraded",
        "model_ready": bool(app.state.model_ready),
        "model_path": str(MODEL_PATH),
        "model_error": app.state.model_error,
    }


@app.post("/predict")
def predict(data: InputText) -> dict[str, object]:
    """Predict the intent for a chatbot message."""

    if not app.state.model_ready:
        raise HTTPException(
            status_code=503,
            detail=f"Model not ready: {app.state.model_error}",
        )

    inputs = app.state.tokenizer(
        data.text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=MODEL_MAX_LENGTH,
    )

    with torch.no_grad():
        outputs = app.state.model(**inputs)

    probs = torch.softmax(outputs.logits, dim=-1)
    pred_id = int(torch.argmax(probs))

    return {
        "intent": app.state.id2label[pred_id],
        "confidence": float(probs[0][pred_id]),
    }