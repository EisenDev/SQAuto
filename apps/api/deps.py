# apps/api/deps.py
"""Dependency utilities for FastAPI.
Provides DB session dependency and a logger.
"""

import logging
from apps.api.database import get_db

# Basic logger configuration – can be extended later
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sqauto")

# FastAPI dependency that yields a DB session
def get_db_dep():
    """Dependency that provides a DB session for FastAPI routes."""
    return get_db()
