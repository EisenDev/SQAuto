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

        # Profile target schema: 'staging'
        try:
            inspector = inspect(engine)
            table_names = inspector.get_table_names(schema="staging")
            logger.info(f"Starting detailed scan for job {job_id} in 'staging'. Found {len(table_names)} tables.")
        except Exception as e:
            logger.error(f"Failed to inspect 'staging' schema for job {job_id}: {e}")
            raise RuntimeError(f"Database inspection failed: {e}")

        schema_info = {}
        total_rows = 0
        total_size_bytes = 0
        
        # Get the job record
        job = db_session.query(Job).filter(Job.id == job_id).first()

        for table_name in table_names:
            columns = []
            try:
                # Use inspector with schema='staging'
                for col in inspector.get_columns(table_name, schema="staging"):
                    columns.append({"name": col["name"], "type": str(col["type"])})
                
                # Count rows
                row_count = db_session.execute(text(f'SELECT COUNT(*) FROM staging."{table_name}"')).scalar()
                total_rows += row_count or 0

                # Data size (bytes)
                size_bytes = db_session.execute(text(f'SELECT pg_total_relation_size(\'staging."{table_name}"\')')).scalar()
                total_size_bytes += size_bytes or 0
            except Exception as e:
                logger.warning(f"Could not profile staging.\"{table_name}\": {e}")

            schema_info[table_name] = columns
            
            # Incremental Update to Database with metadata
            if job:
                job.profile = {
                    "tables": schema_info,
                    "metadata": {
                        "total_rows": total_rows,
                        "table_count": len(schema_info),
                        "data_size_mb": round(total_size_bytes / (1024 * 1024), 2),
                        "duplicate_count": 0, # Placeholder
                        "status": "COMPLETED"
                    }
                }
                db_session.commit()
                
        logger.info(f"Schema profiling completed for job {job_id}. Total Rows: {total_rows}")
        return job.profile
