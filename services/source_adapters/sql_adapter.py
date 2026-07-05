# services/source_adapters/sql_adapter.py
"""SQL Source Adapter.

Wraps the existing DumpRestoreService for .sql, .sql.gz, and .bak files.
No behavior changes — this is a thin delegation wrapper so all adapters
share the same interface via BaseSourceAdapter.
"""

import logging
from sqlalchemy.orm import Session
from services.source_adapters.base import BaseSourceAdapter

logger = logging.getLogger("sqauto.source_adapters.sql")


class SQLAdapter(BaseSourceAdapter):
    """Handles PostgreSQL, MySQL, SQLite, and SQL Server (.bak) dump files.

    Delegates to the existing DumpRestoreService which uses psql/pgloader
    to stream the SQL directly into the staging schema.
    """

    def detect_flavor(self, file_path: str) -> str:
        from services.dump_restore.service import DumpRestoreService
        return DumpRestoreService().detect_flavor(file_path)

    def restore(self, *, job_id, file_path: str, db_session: Session) -> None:
        logger.info(f"[SQLAdapter] Restoring SQL dump for job {job_id}: {file_path}")
        from services.dump_restore.service import DumpRestoreService
        DumpRestoreService().restore(job_id=job_id, file_path=file_path, db_session=db_session)
