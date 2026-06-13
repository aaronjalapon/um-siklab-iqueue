"""Fine-tune XLM-RoBERTa for IQueue multilingual intent classification.

Loads the CSVs produced by prepare_dataset.py, tokenizes, and trains a
5-class sequence classifier using the Hugging Face Trainer API.

Usage:
    python ml/chatbot/train.py                          # full training
    python ml/chatbot/train.py --epochs 2 --batch-size 8  # smoke test
    python ml/chatbot/train.py --dry-run                  # validate data only
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from datasets import Dataset, DatasetDict
from sklearn.metrics import accuracy_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent / "data"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
OUTPUT_DIR = ARTIFACTS_DIR / "xlm-roberta-iqueue"

MODEL_NAME = "FacebookAI/xlm-roberta-base"
MAX_LENGTH = 128

LABELS = [
    "check_booking",
    "request_requeue",
    "get_departure_info",
    "surge_info",
    "fallback",
]
LABEL2ID = {lbl: i for i, lbl in enumerate(LABELS)}
ID2LABEL = {i: lbl for i, lbl in enumerate(LABELS)}
NUM_LABELS = len(LABELS)

SEED = 42


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_datasets() -> DatasetDict:
    """Load train / val CSVs and convert to Hugging Face Datasets."""
    train_path = DATA_DIR / "iqueue_train.csv"
    val_path = DATA_DIR / "iqueue_val.csv"

    if not train_path.exists():
        logger.error(
            "Training data not found at %s. Run prepare_dataset.py first.", train_path
        )
        sys.exit(1)

    train_df = pd.read_csv(train_path)
    train_df["label_id"] = train_df["label"].map(LABEL2ID)

    ds_dict: dict[str, Dataset] = {}
    ds_dict["train"] = Dataset.from_pandas(
        train_df[["text", "label_id", "language", "source"]]
    )

    if val_path.exists():
        val_df = pd.read_csv(val_path)
        val_df["label_id"] = val_df["label"].map(LABEL2ID)
        ds_dict["validation"] = Dataset.from_pandas(
            val_df[["text", "label_id", "language", "source"]]
        )

    ds = DatasetDict(ds_dict)

    logger.info(
        "Loaded %d train / %d val examples",
        len(ds["train"]),
        len(ds.get("validation", [])),
    )
    return ds


def tokenize_fn(batch: dict, tokenizer: AutoTokenizer) -> dict:
    """Tokenize a batch of texts."""
    return tokenizer(
        batch["text"],
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH,
    )


def compute_metrics(eval_pred) -> dict:
    """Compute accuracy from logits."""
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    acc = accuracy_score(labels, preds)
    return {"accuracy": round(acc, 4)}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fine-tune XLM-RoBERTa for IQueue intent classification"
    )
    parser.add_argument(
        "--epochs", type=int, default=8, help="Number of training epochs (default: 8)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="Per-device training batch size (default: 16)",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=2e-5,
        help="Learning rate (default: 2e-5)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Load data and print stats without training",
    )
    args = parser.parse_args()

    # 1. Load data
    ds = load_datasets()

    # Quick data sanity check
    train_labels = ds["train"]["label_id"]
    label_counts = {LABELS[i]: train_labels.count(i) for i in range(NUM_LABELS)}
    logger.info("Training label distribution: %s", label_counts)

    rare_labels = [lbl for lbl, cnt in label_counts.items() if cnt < 5]
    if rare_labels:
        logger.error(
            "Labels with <5 training examples: %s. Add more data before training.",
            rare_labels,
        )
        sys.exit(1)

    if args.dry_run:
        logger.info("Dry run complete — data looks good.")
        return

    # 2. Load tokenizer and model
    logger.info("Loading tokenizer and model: %s", MODEL_NAME)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=NUM_LABELS,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    # 3. Tokenize
    logger.info("Tokenizing datasets (max_length=%d) …", MAX_LENGTH)
    tokenized = ds.map(
        lambda batch: tokenize_fn(batch, tokenizer),
        batched=True,
    )
    tokenized = tokenized.rename_column("label_id", "labels")
    tokenized.set_format("torch", columns=["input_ids", "attention_mask", "labels"])

    # Compute warmup steps from ratio (warmup_ratio is deprecated in v5)
    total_steps = (len(tokenized["train"]) // args.batch_size) * args.epochs
    warmup_steps = max(1, int(total_steps * 0.1))

    # 4. Training arguments
    training_args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        eval_strategy="epoch" if "validation" in ds else "no",
        save_strategy="epoch",
        load_best_model_at_end=True if "validation" in ds else False,
        metric_for_best_model="accuracy" if "validation" in ds else None,
        logging_steps=20,
        warmup_steps=warmup_steps,
        learning_rate=args.lr,
        weight_decay=0.01,
        save_total_limit=2,
        seed=SEED,
        fp16=False,  # CPU-safe default
        report_to="none",  # no wandb / mlflow
    )

    # 5. Train
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized.get("validation"),
        compute_metrics=compute_metrics,
    )

    logger.info(
        "Starting training: %d epochs, batch_size=%d, lr=%.2e",
        args.epochs,
        args.batch_size,
        args.lr,
    )
    trainer.train()

    # 6. Evaluate on validation set
    if "validation" in ds:
        metrics = trainer.evaluate()
        logger.info("Validation metrics: %s", metrics)

    # 7. Save
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    logger.info("Model saved → %s", OUTPUT_DIR)

    # 8. Save label map (string keys for JSON compatibility)
    label_map_path = ARTIFACTS_DIR / "label_map.json"
    label_map_str_keys = {str(k): v for k, v in ID2LABEL.items()}
    with open(label_map_path, "w", encoding="utf-8") as f:
        json.dump(label_map_str_keys, f, indent=2)
    logger.info("Label map → %s", label_map_path)

    logger.info("Done. Next: python ml/chatbot/evaluate.py")


if __name__ == "__main__":
    main()
