# services/dump_restore/service.py
"""Service for restoring SQL dump files into the staging database.
Optimized to handle large files (2GB+) by using the `psql` command-line tool
instead of reading the entire file into memory.
"""

import os
import subprocess
import logging
from typing import Optional
from sqlalchemy.orm import Session
from configs.settings import settings

logger = logging.getLogger("sqauto.dump_restore")

class DumpRestoreService:
    """Handles restoring a SQL dump into the staging database.

    Uses the system's `psql` client to stream the dump file into the database.
    This is much more memory-efficient than reading the file into Python.
    """

    def restore(self, *, job_id, file_path: str, db_session: Optional[Session] = None) -> None:
        """Restore the dump using psql.

        Parameters
        ----------
        job_id: UUID
            Identifier of the job.
        file_path: str
            Absolute path to the uploaded ``.sql`` dump file.
        db_session: Session, optional
            A SQLAlchemy session (unused, kept for compatibility).
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Dump file not found: {file_path}")

        logger.info(f"Starting optimized restore for job {job_id} from {file_path}")

        # Convert SQLAlchemy-style DATABASE_URL to a standard PSQL connection URI
        # e.g., postgresql+psycopg://... -> postgresql://...
        db_url = settings.DATABASE_URL
        if "+psycopg" in db_url:
            db_url = db_url.replace("+psycopg", "")

        try:
            # Run psql as a subprocess. 
            # -f: Read commands from file
            # --quiet: Run quietly
            # --set ON_ERROR_STOP=1: Stop if an error occurs
            cmd = [
                "psql",
                db_url,
                "-f", file_path,
                "--set", "ON_ERROR_STOP=1",
                "--quiet"
            ]
            
            # Using env variables for password if not in URI is also possible, 
            # but URI is most common here.
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            logger.info(f"Restore completed successfully for job {job_id}")

        except subprocess.CalledProcessError as e:
            error_msg = f"psql restore failed for job {job_id}: {e.stderr}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error during restore for job {job_id}: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
