"""Unit tests for model-admin optional dependency handling."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.v1 import model_admin


def test_model_admin_import_safe_without_pandas() -> None:
    """Importing model_admin must not eagerly import pandas or retraining."""

    project_root = Path(__file__).resolve().parents[3]
    script = """
import importlib
import importlib.abc
import sys

class BlockPandas(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == "pandas" or fullname.startswith("pandas."):
            raise ModuleNotFoundError("blocked pandas for import-safety test")
        return None

sys.path.insert(0, "backend")
sys.meta_path.insert(0, BlockPandas())
import app.api.v1.model_admin
print("ok")
"""
    proc = subprocess.run(
        [sys.executable, "-c", script],
        cwd=project_root,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    assert "ok" in proc.stdout


def test_retraining_loader_returns_503_when_optional_deps_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """The loader should translate missing ML-only deps into a clean 503."""

    def _raise(_: str):
        raise ImportError("No module named 'pandas'")

    monkeypatch.setattr(model_admin.importlib, "import_module", _raise)

    with pytest.raises(HTTPException) as excinfo:
        model_admin._get_retraining_service()

    assert excinfo.value.status_code == 503
    assert "full ML runtime" in str(excinfo.value.detail)
