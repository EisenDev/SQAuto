# services/source_adapters/base.py
"""Abstract base class for all source adapters.

Every adapter must implement:
  - detect_flavor(file_path) → str   — returns a dialect label
  - restore(job_id, file_path, db_session) → None  — loads data into staging schema
"""

from abc import ABC, abstractmethod
from sqlalchemy.orm import Session


class BaseSourceAdapter(ABC):
    """Abstract contract that all source adapters must satisfy."""

    @abstractmethod
    def detect_flavor(self, file_path: str) -> str:
        """Return a string label identifying the database flavor.

        Examples: "progress_openedge", "postgres", "mysql", "sqlite"
        """
        ...

    @abstractmethod
    def restore(self, *, job_id, file_path: str, db_session: Session) -> None:
        """Load data from file_path into the PostgreSQL staging schema.

        All adapters MUST:
        - Wipe and recreate the 'staging' schema before loading.
        - Store progress in job.profile['metadata'] via db_session.
        - Set job.status = 'failed' and raise on fatal errors.
        """
        ...
