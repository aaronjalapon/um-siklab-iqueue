"""Evaluate the fine-tuned XLM-RoBERTa model on the IQueue test set.

Computes per-language accuracy, per-intent recall, and confusion matrices.
Flags any intent with recall below 0.70 and exits non-zero if thresholds
are not met.

Usage:
    python ml/chatbot/evaluate.py
    python ml/chatbot/evaluate.py --model-path custom/path
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    recall_score,
)
from transformers import pipeline

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent / "data"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_MODEL_PATH = ARTIFACTS_DIR / "xlm-roberta-iqueue"

RECALL_THRESHOLD = 0.70
ACCURACY_THRESHOLD = 0.80

LANGS_FULL: dict[str, str] = {
    "en": "English",
    "fil": "Filipino",
    "id": "Bahasa Indonesia",
    "vi": "Vietnamese",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_test_data(model_path: Path) -> tuple[pd.DataFrame, dict[str, int]]:
    """Load test CSV and label map."""
    test_path = DATA_DIR / "iqueue_test.csv"
    if not test_path.exists():
        logger.error("Test data not found at %s. Run prepare_dataset.py first.", test_path)
        sys.exit(1)

    df = pd.read_csv(test_path)
    logger.info("Loaded %d test examples", len(df))

    label_map_path = model_path / "label_map.json"
    if label_map_path.exists():
        with open(label_map_path) as f:
            label_map_str = json.load(f)
        # Keys are strings like "0", "1", … convert to int→label
        label_map = {int(k): v for k, v in label_map_str.items()}
    else:
        logger.warning("label_map.json not found — using hard-coded labels")
        label_map = {
            0: "check_booking",
            1: "request_requeue",
            2: "get_departure_info",
            3: "surge_info",
            4: "fallback",
        }

    return df, {v: k for k, v in label_map.items()}  # label→id


def load_pipeline(model_path: Path):
    """Load the text-classification pipeline."""
    if not model_path.exists():
        logger.error("Model not found at %s. Run train.py first.", model_path)
        sys.exit(1)

    logger.info("Loading pipeline from %s …", model_path)
    return pipeline(
        "text-classification",
        model=str(model_path),
        tokenizer=str(model_path),
        top_k=None,  # all scores
        device=-1,
    )


def _parse_top_intent(
    pipeline_result: list[dict],
    label2id: dict[str, int],
) -> tuple[int, float]:
    """Extract the highest-scoring label from pipeline output.

    Pipeline returns list of dicts like [{"label": "LABEL_0", "score": 0.95}, ...].
    """
    if not pipeline_result or not pipeline_result[0]:
        return "fallback", 0.0

    results = pipeline_result[0] if isinstance(pipeline_result, list) else pipeline_result
    best = max(results, key=lambda x: x["score"])
    label_str = str(best["label"])
    if label_str in label2id:
        return label2id[label_str], round(best["score"], 4)
    # Handle both "LABEL_0" and "0" formats
    if label_str.startswith("LABEL_"):
        label_idx = int(label_str.split("_")[1])
    else:
        label_idx = int(label_str)
    return label_idx, round(best["score"], 4)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Evaluate XLM-RoBERTa intent classifier on test set"
    )
    parser.add_argument(
        "--model-path",
        type=Path,
        default=DEFAULT_MODEL_PATH,
        help="Path to the fine-tuned model directory",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "evidence/chatbot_evaluation.json",
        help="Machine-readable evaluation report",
    )
    args = parser.parse_args()

    # 1. Load data
    df, label2id = load_test_data(args.model_path)
    labels_sorted = sorted(label2id.keys())

    # 2. Load pipeline
    pipe = load_pipeline(args.model_path)

    # 3. Run inference
    y_true: list[int] = []
    y_pred: list[int] = []

    for _, row in df.iterrows():
        text = row["text"]
        true_label = row["label"]

        true_id = label2id.get(true_label, 4)  # default to fallback
        y_true.append(true_id)

        try:
            result = pipe(text)
            pred_id, _ = _parse_top_intent(result, label2id)
            y_pred.append(pred_id)
        except Exception as exc:
            logger.warning("Inference failed for '%s': %s", text[:60], exc)
            y_pred.append(4)  # fallback

    # 4. Overall accuracy
    overall_acc = accuracy_score(y_true, y_pred)
    logger.info("=" * 56)
    logger.info("  Overall Accuracy: %.4f  (threshold: ≥%.2f)",
                 overall_acc, ACCURACY_THRESHOLD)
    logger.info("=" * 56)

    # 5. Per-language accuracy
    logger.info("\n--- Per-Language Accuracy ---")
    all_lang_ok = True
    language_accuracy: dict[str, float] = {}
    for lang_code, lang_name in LANGS_FULL.items():
        mask = df["language"] == lang_code
        if not mask.any():
            logger.info("  %-20s : (no examples)", lang_name)
            continue

        lang_y_true = [y_true[i] for i, m in enumerate(mask) if m]
        lang_y_pred = [y_pred[i] for i, m in enumerate(mask) if m]
        lang_acc = accuracy_score(lang_y_true, lang_y_pred)
        language_accuracy[lang_code] = float(lang_acc)
        flag = " ✓" if lang_acc >= ACCURACY_THRESHOLD else " ⚠ BELOW THRESHOLD"
        logger.info("  %-20s : %.4f%s", lang_name, lang_acc, flag)
        if lang_acc < ACCURACY_THRESHOLD:
            all_lang_ok = False

    # 6. Per-intent recall
    logger.info("\n--- Per-Intent Recall ---")
    all_intent_ok = True
    recall_report: dict[str, float] = {}

    for intent in labels_sorted:
        intent_id = label2id[intent]
        intent_mask = np.array(y_true) == intent_id
        if not intent_mask.any():
            logger.info("  %-25s : (no examples)", intent)
            continue

        rec = recall_score(
            [1 if x == intent_id else 0 for x in y_true],
            [1 if x == intent_id else 0 for x in y_pred],
            zero_division=0,
        )
        recall_report[intent] = rec
        flag = " ✓" if rec >= RECALL_THRESHOLD else " ⚠ BELOW THRESHOLD"
        logger.info("  %-25s : %.4f%s", intent, rec, flag)
        if rec < RECALL_THRESHOLD:
            all_intent_ok = False

    # 7. Per-language confusion matrices
    logger.info("\n--- Confusion Matrices ---")
    intent_order = sorted(label2id, key=label2id.get)
    confusion_reports: dict[str, list[list[int]]] = {}
    for lang_code, lang_name in LANGS_FULL.items():
        mask = df["language"] == lang_code
        if not mask.any():
            continue

        lang_y_true = [y_true[i] for i, m in enumerate(mask) if m]
        lang_y_pred = [y_pred[i] for i, m in enumerate(mask) if m]
        cm = confusion_matrix(
            lang_y_true,
            lang_y_pred,
            labels=[label2id[intent] for intent in intent_order],
        )
        confusion_reports[lang_code] = cm.tolist()
        logger.info("\n  %s:", lang_name)
        header = "           " + " ".join(f"{lbl[:8]:>8}" for lbl in intent_order)
        logger.info("  %s", header)
        for i, lbl in enumerate(intent_order):
            row = "  ".join(f"{v:>8}" for v in cm[i])
            logger.info("  %-10s %s", lbl[:10], row)

    # 8. Summary
    coverage = {
        language: {
            intent: int(
                ((df["language"] == language) & (df["label"] == intent)).sum()
            )
            for intent in intent_order
        }
        for language in LANGS_FULL
    }
    coverage_ok = all(
        count >= 10
        for language_counts in coverage.values()
        for count in language_counts.values()
    )
    passed = bool(
        overall_acc >= ACCURACY_THRESHOLD
        and all_lang_ok
        and all_intent_ok
        and coverage_ok
    )
    report = {
        "model_path": str(args.model_path),
        "evaluation_data": "curated and MASSIVE holdout",
        "examples": len(df),
        "overall_accuracy": round(float(overall_acc), 4),
        "per_language_accuracy": {
            key: round(value, 4) for key, value in language_accuracy.items()
        },
        "per_intent_recall": {
            key: round(float(value), 4) for key, value in recall_report.items()
        },
        "fallback_prediction_rate": round(
            sum(pred == label2id["fallback"] for pred in y_pred) / len(y_pred),
            4,
        ),
        "minimum_examples_per_language_intent": 10,
        "coverage": coverage,
        "coverage_passed": coverage_ok,
        "intent_order": intent_order,
        "confusion_matrices": confusion_reports,
        "thresholds": {
            "overall_accuracy": ACCURACY_THRESHOLD,
            "per_language_accuracy": ACCURACY_THRESHOLD,
            "per_intent_recall": RECALL_THRESHOLD,
        },
        "passed": passed,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    logger.info("Wrote evaluation report to %s", args.output)

    logger.info("\n" + "=" * 56)
    if passed:
        logger.info("  ✓ All thresholds passed!")
        logger.info("=" * 56)
        sys.exit(0)
    else:
        if overall_acc < ACCURACY_THRESHOLD:
            logger.error("  ✗ Overall accuracy %.4f < %.2f", overall_acc, ACCURACY_THRESHOLD)
        if not all_lang_ok:
            logger.error("  ✗ Some languages below %.0f%% accuracy threshold", ACCURACY_THRESHOLD * 100)
        if not all_intent_ok:
            flagged = [i for i, r in recall_report.items() if r < RECALL_THRESHOLD]
            logger.error(
                "  ✗ Intents below %.0f%% recall: %s",
                RECALL_THRESHOLD * 100,
                ", ".join(flagged),
            )
            logger.error("  → Add more training examples for these intents.")
        if not coverage_ok:
            logger.error("  ✗ Some intent-language cells have fewer than 10 examples")
        logger.info("=" * 56)
        sys.exit(1)


if __name__ == "__main__":
    main()
