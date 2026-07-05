# services/source_adapters/router.py
"""Source Adapter Router.

Inspects the uploaded file and returns the appropriate adapter instance.
Add new adapters here as new formats are supported.

Routing priority:
  1. .zip → inspect contents for .df → ProgressDFAdapter
  2. .df  → ProgressDFAdapter
  3. .d   → ProgressDFAdapter (schema-less data, will warn)
  4. Everything else (.sql, .sql.gz, .bak) → SQLAdapter
"""

from __future__ import annotations

import logging
import os
import zipfile

from services.source_adapters.base import BaseSourceAdapter

logger = logging.getLogger("sqauto.source_adapters.router")


def get_adapter(file_path: str) -> BaseSourceAdapter:
    """Return the appropriate source adapter for the given file.

    Parameters
    ----------
    file_path : str
        Absolute path to the uploaded file on disk.

    Returns
    -------
    BaseSourceAdapter
        The adapter that can handle this file type.
    """
    ext = os.path.splitext(file_path)[1].lower()
    basename = os.path.basename(file_path).lower()

    # Progress .df schema file
    if ext == ".df":
        logger.info(f"[AdapterRouter] Routing {basename} → ProgressDFAdapter (.df)")
        from services.source_adapters.progress_df_adapter import ProgressDFAdapter
        return ProgressDFAdapter()

    # Progress standalone .d data file (unusual but supported)
    if ext == ".d":
        logger.warning(
            f"[AdapterRouter] .d file without .df schema → ProgressDFAdapter will attempt schema-less load"
        )
        from services.source_adapters.progress_df_adapter import ProgressDFAdapter
        return ProgressDFAdapter()

    # ZIP archive — inspect contents to decide
    if ext == ".zip":
        if _zip_contains_progress(file_path):
            logger.info(f"[AdapterRouter] Routing {basename} → ProgressDFAdapter (.zip with .df/.d)")
            from services.source_adapters.progress_df_adapter import ProgressDFAdapter
            return ProgressDFAdapter()
        else:
            logger.warning(
                f"[AdapterRouter] ZIP does not contain .df files — falling back to SQLAdapter"
            )
            from services.source_adapters.sql_adapter import SQLAdapter
            return SQLAdapter()

    # Default: SQL dumps (.sql, .sql.gz, .bak)
    logger.info(f"[AdapterRouter] Routing {basename} → SQLAdapter")
    from services.source_adapters.sql_adapter import SQLAdapter
    return SQLAdapter()


def _zip_contains_progress(zip_path: str) -> bool:
    """Return True if the ZIP contains at least one .df file."""
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                if name.lower().endswith(".df"):
                    return True
    except Exception as e:
        logger.warning(f"[AdapterRouter] Could not inspect ZIP {zip_path}: {e}")
    return False


def detect_source_type(file_path: str) -> str:
    """Return a short source type label for the given file path.

    Used for storing source_type in Job.profile metadata.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext in (".df", ".d"):
        return "progress_openedge"
    if ext == ".zip" and _zip_contains_progress(file_path):
        return "progress_openedge"
    return "sql"
