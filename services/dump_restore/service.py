# services/dump_restore/service.py
"""Service for restoring SQL dump files into the staging database.
Implements a simple restore using SQLAlchemy to execute the dump content.
The dump file is treated as read-only source; the restore happens only in the
staging database defined by SETTINGS.DATABASE_URL.
"""

import os
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from apps.api.database import engine

logger = logging.getLogger("sqauto.dump_restore")

class DumpRestoreService:
    """Handles restoring a SQL dump into the staging database.

    The service reads the provided ``file_path`` (a .sql file) and executes its
    content against the staging database using the SQLAlchemy engine. Errors are
    logged and propagated to the caller so that the API layer can update the
    ``Job`` status accordingly.
    """

    def __init__(self):
        # No state is required; the engine is imported globally.
        pass

    def restore(self, *, job_id, file_path: str, db_session: Session) -> None:
        """Restore the dump for ``job_id``.

        Parameters
        ----------
        job_id: UUID
            Identifier of the job – currently unused but kept for future
            extensibility (e.g., logging, audit trails).
        file_path: str
            Absolute path to the uploaded ``.sql`` dump file.
        db_session: Session
            A SQLAlchemy session – not used directly because we execute via the
            engine connection, but the session is kept to satisfy the calling
            signature and to allow future transactional handling.
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Dump file not found: {file_path}")

        logger.info(f"Starting restore for job {job_id} from {file_path}")
        # Read the entire dump file. For very large dumps this could be streamed,
        # but for the MVP we keep it simple.
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Execute the SQL content against the staging database.
        # ``engine`` is bound to the staging DB URL defined in settings.
        with engine.begin() as conn:
            # ``text`` safely wraps the raw SQL string.
            conn.execute(text(sql_content))

        logger.info(f"Restore completed for job {job_id}")
