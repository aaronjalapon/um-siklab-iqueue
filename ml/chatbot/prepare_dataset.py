"""Build IQueue intent-classification dataset from MASSIVE + synthetic data.

Pulls the qanastek/MASSIVE dataset for 4 ASEAN locales, remaps 8 MASSIVE
intents to 5 IQueue intents, and fills gaps (surge_info, request_requeue)
with Anthropic-generated synthetic utterances.

Usage:
    python ml/chatbot/prepare_dataset.py                # full pipeline
    python ml/chatbot/prepare_dataset.py --dry-run      # print stats only
    python ml/chatbot/prepare_dataset.py --no-synthetic # skip Anthropic API
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import os
import random
import sys
import tarfile
import urllib.request
from collections import defaultdict
from pathlib import Path

# Make project packages importable when run as a script
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# Load .env so standalone scripts can read DEEPSEEK_API_KEY etc.
try:
    from dotenv import load_dotenv

    _env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(_env_path)
except ImportError:
    pass

from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).resolve().parent / "data"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"

LOCALES: dict[str, str] = {
    "en": "en-US",
    "fil": "tl-PH",
    "id": "id-ID",
    "vi": "vi-VN",
}

LABELS = [
    "check_booking",
    "request_requeue",
    "get_departure_info",
    "surge_info",
    "fallback",
]
LABEL2ID = {lbl: i for i, lbl in enumerate(LABELS)}
ID2LABEL = {i: lbl for i, lbl in enumerate(LABELS)}

# MASSIVE scenario + intent → IQueue label
REMAP: dict[str, str] = {
    "transport_query": "get_departure_info",
    "datetime_query": "get_departure_info",
    "general_quirky": "fallback",
    "qa_factoid": "fallback",
    "qa_maths": "fallback",
    "calendar_query": "check_booking",
    "recommendation_events": "check_booking",
    "transport_ticket": "request_requeue",
}

TARGET_PER_INTENT_PER_LANG = 127
SYNTHETIC_COUNT = 70

SEED = 42

# MASSIVE raw data is hosted on Amazon S3 (the Hugging Face loading script
# is no longer supported by modern `datasets`).
MASSIVE_URL = (
    "https://amazon-massive-nlu-dataset.s3.amazonaws.com/"
    "amazon-massive-dataset-1.0.tar.gz"
)
MASSIVE_CACHE_PATH = Path("/tmp/massive-dataset.tar.gz")

LANGS_FULL: dict[str, str] = {
    "en": "English",
    "fil": "Filipino (Tagalog)",
    "id": "Bahasa Indonesia",
    "vi": "Vietnamese",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _download_massive_archive() -> io.BytesIO:
    """Download (or load from cache) the MASSIVE tar.gz archive.

    Returns a BytesIO buffer positioned at the start of the archive.
    """
    if MASSIVE_CACHE_PATH.exists():
        logger.info("Using cached MASSIVE archive → %s", MASSIVE_CACHE_PATH)
        return io.BytesIO(MASSIVE_CACHE_PATH.read_bytes())

    logger.info("Downloading MASSIVE archive (~39 MB) …")
    with urllib.request.urlopen(MASSIVE_URL) as resp:
        raw = resp.read()
    MASSIVE_CACHE_PATH.write_bytes(raw)
    logger.info("Cached to %s (%d bytes)", MASSIVE_CACHE_PATH, len(raw))
    return io.BytesIO(raw)


def _load_massive_rows(
    locale_code: str,
    language: str,
    archive: io.BytesIO,
) -> list[dict]:
    """Extract one locale's JSONL from the MASSIVE tar archive and remap intents.

    The JSONL lines have fields: id, locale, partition, scenario, intent, utt, …
    The ``intent`` field is already a string (e.g. ``"transport_query"``).
    """
    rows: list[dict] = []
    target_member = f"1.0/data/{locale_code}.jsonl"

    try:
        archive.seek(0)
        with tarfile.open(fileobj=archive, mode="r:gz") as tar:
            for member in tar.getmembers():
                if target_member in member.name:
                    f = tar.extractfile(member)
                    if f is None:
                        continue
                    for line in f.read().decode("utf-8").split("\n"):
                        line = line.strip()
                        if not line:
                            continue
                        datum = json.loads(line)
                        # Only use the official training split
                        if datum.get("partition") != "train":
                            continue

                        intent_str = datum.get("intent", "")
                        iqueue_label = REMAP.get(intent_str)
                        if iqueue_label is None:
                            continue

                        rows.append(
                            {
                                "text": datum["utt"],
                                "label": iqueue_label,
                                "language": language,
                                "source": "massive",
                            }
                        )
                    break  # Found the right member, stop scanning
    except Exception as exc:
        logger.warning(
            "Failed to extract MASSIVE/%s from archive: %s", locale_code, exc
        )
        return rows

    return rows


def _generate_synthetic(
    intent: str,
    language_code: str,
    n: int = SYNTHETIC_COUNT,
) -> list[str]:
    """Generate synthetic utterances via the DeepSeek API.

    Returns an empty list if DEEPSEEK_API_KEY is not set or the API call fails.
    """
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        logger.warning(
            "DEEPSEEK_API_KEY not set — skipping synthetic generation for %s/%s",
            intent,
            language_code,
        )
        return []

    language_label = LANGS_FULL.get(language_code, language_code)

    prompt = (
        f"Generate {n} short, natural user queries in {language_label} that express "
        f"the intent '{intent}' in the context of a bus terminal booking app. "
        f"Make them diverse — vary vocabulary, sentence structure, and formality. "
        f"Return ONLY a JSON array of strings, no explanations."
    )

    try:
        import httpx
        import re as _re

        response = httpx.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000,
                "temperature": 0.8,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]

        # Extract the JSON array — DeepSeek may wrap it in markdown or add prose
        match = _re.search(r"\[.*?\]", text, _re.DOTALL)
        if match:
            return json.loads(match.group())
        else:
            # Fallback: try the whole response after stripping fences
            text = text.strip().removeprefix("```json").removeprefix("```").strip()
            return json.loads(text)
    except Exception as exc:
        logger.warning("Synthetic generation failed for %s/%s: %s", intent, language_code, exc)
        return []


def _balance_massive(
    rows: list[dict],
    per_intent_per_lang: int = TARGET_PER_INTENT_PER_LANG,
) -> list[dict]:
    """Down-sample MASSIVE rows to ~N per (intent, language)."""
    random.seed(SEED)
    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in rows:
        key = (r["label"], r["language"])
        grouped[key].append(r)

    balanced: list[dict] = []
    for key, group in grouped.items():
        if len(group) > per_intent_per_lang:
            group = random.sample(group, per_intent_per_lang)
        balanced.extend(group)

    return balanced


def _fill_gaps_synthetic(rows: list[dict]) -> list[dict]:
    """Generate synthetic rows for intents with fewer than SYNTHETIC_COUNT examples
    per language."""
    # Count existing per (intent, language)
    counts: dict[tuple[str, str], int] = defaultdict(int)
    for r in rows:
        counts[(r["label"], r["language"])] += 1

    synthetic_rows: list[dict] = []
    for lang in LANGS_FULL:
        for intent in LABELS:
            existing = counts.get((intent, lang), 0)
            needed = max(0, SYNTHETIC_COUNT - existing)
            if needed == 0:
                continue
            logger.info(
                "Generating %d synthetic rows for %s/%s (have %d)",
                needed, intent, lang, existing,
            )
            utterances = _generate_synthetic(intent, lang, needed)
            for utt in utterances:
                synthetic_rows.append(
                    {
                        "text": utt,
                        "label": intent,
                        "language": lang,
                        "source": "synthetic",
                    }
                )

    return rows + synthetic_rows


def _stratified_split(
    rows: list[dict],
    train_frac: float = 0.8,
    val_frac: float = 0.1,
) -> tuple[list[dict], list[dict], list[dict]]:
    """80/10/10 split stratified by (label, language)."""
    # Handle empty data case
    if not rows:
        return [], [], []

    # If we have very little data, just split it simply
    if len(rows) < 10:
        logger.warning("Very little data (%d rows), using simple random split instead of stratified", len(rows))
        train, rest = train_test_split(rows, test_size=1-train_frac, random_state=SEED)
        if len(rest) == 0:
            return train, [], []
        val_frac_of_rest = val_frac / (1 - train_frac)
        val, test = train_test_split(rest, test_size=1-val_frac_of_rest, random_state=SEED)
        return train, val, test

    # Create a combined stratify key
    stratify_key = [f"{r['label']}__{r['language']}" for r in rows]

    # Check if we have enough data for stratification
    unique_keys = set(stratify_key)
    if len(unique_keys) > len(rows) // 3:  # Not enough samples per class for stratification
        logger.warning("Insufficient data for stratified split, using simple random split")
        train, rest = train_test_split(rows, test_size=1-train_frac, random_state=SEED)
        if len(rest) == 0:
            return train, [], []
        val_frac_of_rest = val_frac / (1 - train_frac)
        val, test = train_test_split(rest, test_size=1-val_frac_of_rest, random_state=SEED)
        return train, val, test

    try:
        train, rest = train_test_split(
            rows,
            test_size=1 - train_frac,
            stratify=stratify_key,
            random_state=SEED,
        )
        rest_keys = [f"{r['label']}__{r['language']}" for r in rest]
        val_frac_of_rest = val_frac / (1 - train_frac)
        val, test = train_test_split(
            rest,
            test_size=1 - val_frac_of_rest,
            stratify=rest_keys,
            random_state=SEED,
        )
    except ValueError as e:
        logger.warning("Stratified split failed: %s. Using simple random split.", e)
        train, rest = train_test_split(rows, test_size=1-train_frac, random_state=SEED)
        if len(rest) == 0:
            return train, [], []
        val_frac_of_rest = val_frac / (1 - train_frac)
        val, test = train_test_split(rest, test_size=1-val_frac_of_rest, random_state=SEED)

    return train, val, test


def _write_csv(rows: list[dict], path: Path) -> None:
    """Write rows to CSV with columns: text, label, language, source."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "label", "language", "source"])
        writer.writeheader()
        writer.writerows(rows)
    logger.info("Wrote %d rows → %s", len(rows), path)


def _print_stats(rows: list[dict], title: str = "Dataset") -> None:
    """Log per-intent per-language row counts."""
    counts: dict[tuple[str, str], int] = defaultdict(int)
    for r in rows:
        counts[(r["label"], r["language"])] += 1

    logger.info("=== %s Stats ===", title)
    logger.info("Total rows: %d", len(rows))

    if not rows:
        logger.info("  No data available.")
        return

    for lang in LANGS_FULL:
        for intent in LABELS:
            n = counts.get((intent, lang), 0)
            flag = " ⚠" if n < 25 else ""
            logger.info("  %s / %-25s : %d%s", lang, intent, n, flag)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build IQueue chatbot training dataset from MASSIVE + synthetic data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Load and print stats without writing CSVs",
    )
    parser.add_argument(
        "--no-synthetic",
        action="store_true",
        help="Skip Anthropic synthetic data generation",
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=None,
        help="Cap MASSIVE rows per intent per language (default: %d)" % TARGET_PER_INTENT_PER_LANG,
    )
    args = parser.parse_args()

    sample_n = args.sample or TARGET_PER_INTENT_PER_LANG

    # 1. Load MASSIVE (direct S3 download — datasets library no longer supports
    #    the MASSIVE.py loading script)
    logger.info("Downloading MASSIVE archive …")
    archive = _download_massive_archive()

    all_rows: list[dict] = []
    for lang_code, locale_code in LOCALES.items():
        logger.info("Extracting MASSIVE/%s …", locale_code)
        rows = _load_massive_rows(locale_code, lang_code, archive)
        logger.info("  → %d remapped rows for %s", len(rows), lang_code)
        all_rows.extend(rows)

    if not all_rows:
        logger.warning("No MASSIVE rows loaded. Proceeding with synthetic data generation only.")
        all_rows = []  # Initialize as empty list to continue with synthetic data

    # 2. Balance MASSIVE rows
    balanced = _balance_massive(all_rows, per_intent_per_lang=sample_n)
    logger.info("After balancing: %d rows", len(balanced))

    # 3. Generate synthetic for gaps
    if not args.no_synthetic:
        balanced = _fill_gaps_synthetic(balanced)
    else:
        logger.info("Skipping synthetic generation (--no-synthetic)")

    _print_stats(balanced)

    if args.dry_run:
        logger.info("Dry run complete — no files written.")
        return

    # 4. Split
    train, val, test = _stratified_split(balanced)

    # 5. Write CSVs
    _write_csv(train, DATA_DIR / "iqueue_train.csv")
    _write_csv(val, DATA_DIR / "iqueue_val.csv")
    _write_csv(test, DATA_DIR / "iqueue_test.csv")

    # 6. Write label map
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    label_map_path = ARTIFACTS_DIR / "label_map.json"
    with open(label_map_path, "w", encoding="utf-8") as f:
        json.dump(ID2LABEL, f, indent=2)
    logger.info("Label map → %s", label_map_path)

    logger.info("Done. Next: python ml/chatbot/train.py")


if __name__ == "__main__":
    main()
