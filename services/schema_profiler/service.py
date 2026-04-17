# services/schema_profiler/service.py
"""Service for profiling the restored staging database schema.
Collects basic metadata about tables and columns and stores it in the Job
record's ``profile`` JSON field.
"""

import logging
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from apps.api.database import engine

logger = logging.getLogger("sqauto.schema_profiler")

class SchemaProfilerService:
    """Profiles the database schema after a dump restore.

    The ``profile`` method gathers a simple dictionary mapping table names to a
    list of column definitions (name and type). This information is stored in the
    ``Job.profile`` JSON column by the caller.
    """

    def __init__(self):
        pass

    def profile(self, *, job_id, db_session: Session) -> dict:
        """Collect schema information for ``job_id``.

        Parameters
        ----------
        job_id: UUID
            Identifier of the job – currently unused but kept for future audit.
        db_session: Session
            A SQLAlchemy session; not used directly because inspection works via
            the engine, but kept for signature compatibility.

        Returns
        -------
        dict
            A mapping of table names to lists of column definitions.
        """
        inspector = inspect(engine)
        schema_info = {}
        for table_name in inspector.get_table_names():
            columns = []
            for col in inspector.get_columns(table_name):
                columns.append({"name": col["name"], "type": str(col["type"])})
            schema_info[table_name] = columns
        logger.info(f"Schema profiling completed for job {job_id}")
        return schema_info
