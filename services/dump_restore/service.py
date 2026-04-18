# services/dump_restore/service.py
"""Service for restoring SQL dump files into the staging database.
Optimized to handle large files (2GB+) by using the `psql` command-line tool
instead of reading the entire file into memory.
"""

import os
import subprocess
import logging
import time
import shutil
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from configs.settings import settings

logger = logging.getLogger("sqauto.dump_restore")

class DumpRestoreService:
    """Handles restoring a SQL dump into the staging database.

    Uses the system's `psql` client or `pgloader` to stream the dump file.
    """

    def detect_flavor(self, file_path: str) -> str:
        """Heuristic to detect the SQL dump flavor, supporting gzip."""
        try:
            import gzip
            opener = gzip.open if file_path.lower().endswith(".gz") else open
            with opener(file_path, "rt", encoding="utf-8", errors="ignore") as f:
                head = f.read(4096)
                if "-- MySQL dump" in head or "/*!40101 SET @OLD_CHARACTER_SET_CLIENT" in head:
                    return "mysql"
                if "PostgreSQL database dump" in head or "CREATE TABLE public." in head or "COPY " in head:
                    return "postgres"
                if "SQLite" in head:
                    return "sqlite"
        except Exception as e:
            logger.warning(f"Flavor detection failed: {e}")
        return "postgres" # Default to postgres

    def restore(self, *, job_id, file_path: str, db_session: Session) -> None:
        """Universal restore with Deadlock-Free streaming and industrial trace logging.
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Dump file not found: {file_path}")

        flavor = self.detect_flavor(file_path)
        is_gz = file_path.lower().endswith(".gz")
        logger.info(f"Detected SQL flavor: {flavor} (Compressed: {is_gz}) for job {job_id}")

        db_url = settings.DATABASE_URL
        if "+psycopg" in db_url:
            db_url = db_url.replace("+psycopg", "")

        from apps.api.models import Job

        # 1. Industrial Wipe - Isolation into 'staging' schema
        try:
            db_session.execute(text("DROP SCHEMA IF EXISTS staging CASCADE"))
            db_session.execute(text("CREATE SCHEMA staging"))
            db_session.commit()
            logger.info(f"Staging schema wiped and recreated for job {job_id}")
        except Exception as e:
            logger.error(f"Failed to wipe staging schema: {e}")
            raise RuntimeError(f"Database preparation failed: {e}")

        # 2. Prepare Log Files (Prevents Pipe Deadlock)
        uploads_dir = os.path.dirname(file_path)
        trace_path = os.path.join(uploads_dir, "industrial_trace.log")
        db_log_path = os.path.join(uploads_dir, "restoration.log")
        
        try:
            # 3. Prepare Command & Environment
            env = os.environ.copy()
            if flavor == "postgres":
                env["PGOPTIONS"] = "-c search_path=staging"
                cmd = ["psql", db_url, "-f", "-", "--set", "ON_ERROR_STOP=1", "--quiet"]
            elif flavor == "mysql":
                cmd = ["pgloader", "--type", "mysql", "--with", "quote identifiers", "--set", "search_path='staging'", "-", db_url]
            else:
                raise ValueError(f"Unsupported SQL flavor: {flavor}")

            # Verify Binary Availability
            psql_path = shutil.which("psql")
            if not psql_path:
                logger.error("SYSTEM CRITICAL: 'psql' binary not found in PATH")
                raise RuntimeError("'psql' client not installed in container")

            # --- DEADLOCK PREVENTION: Redirect stdout/stderr to disk file ---
            with open(db_log_path, "w") as db_log_f, open(trace_path, "w") as trace_f:
                trace_f.write(f"INDUSTRIAL STREAMS START: Job {job_id} | File: {file_path}\n")
                
                # Start the process with redirected output to avoid buffer hangs
                process = subprocess.Popen(
                    cmd, 
                    stdin=subprocess.PIPE, 
                    stdout=db_log_f, 
                    stderr=subprocess.STDOUT, 
                    text=True, 
                    env=env
                )
                
                uncompressed_bytes = 0
                compressed_bytes = 0
                last_sync_bytes = 0

                def industrial_rewrite(text_data: str) -> str:
                    # Isolation and filtering
                    return text_data.replace('public.', 'staging.').replace('"public".', '"staging".')

                # Streaming Block
                try:
                    if is_gz:
                        import gzip
                        raw_f = open(file_path, "rb")
                        stream = gzip.open(raw_f, "rt", encoding="utf-8", errors="ignore")
                    else:
                        raw_f = None
                        stream = open(file_path, "rt", encoding="utf-8", errors="ignore")

                    try:
                        CHUNK_SIZE = 1024 * 1024 # 1MB
                        while True:
                            raw_chunk = stream.read(CHUNK_SIZE)
                            if not raw_chunk:
                                break
                            
                            to_write = industrial_rewrite(raw_chunk)
                            uncompressed_bytes += len(to_write)
                            
                            if raw_f:
                                compressed_bytes = raw_f.tell()
                            else:
                                compressed_bytes = uncompressed_bytes
                            
                            try:
                                process.stdin.write(to_write)
                                process.stdin.flush()
                            except BrokenPipeError:
                                trace_f.write("ERROR: Broken Pipe (Database disconnected)\n")
                                break
                            
                            if uncompressed_bytes - last_sync_bytes > 5 * 1024 * 1024:
                                self._flush_progress(db_session, job_id, flavor, uncompressed_bytes, compressed_bytes)
                                last_sync_bytes = uncompressed_bytes
                                trace_f.write(f"Streaming: {round(uncompressed_bytes/(1024*1024), 2)} MB\n")
                                trace_f.flush()
                                
                        process.stdin.close()
                    finally:
                        stream.close()
                        if raw_f: raw_f.close()
                except Exception as e:
                    process.kill()
                    raise e
                
                # Final monitoring
                while process.poll() is None:
                    self._flush_progress(db_session, job_id, flavor, uncompressed_bytes, compressed_bytes)
                    time.sleep(1)

                if process.returncode != 0:
                    # Read the tail of the log for the error
                    with open(db_log_path, "r") as f:
                        error_detail = f.read().splitlines()[-10:] # Last 10 lines
                    error_msg = "\n".join(error_detail) if error_detail else "Unknown Database Error"
                    db_session.query(Job).filter(Job.id == job_id).update({"log": error_msg})
                    db_session.commit()
                    raise RuntimeError(f"Database restoration failed: {error_msg}")

            logger.info(f"Industrial restore completed for job {job_id}")
        except Exception as e:
            logger.error(f"Restoration failed for job {job_id}: {str(e)}")
            raise RuntimeError(f"Industrial Restoration failed: {e}")

    def _flush_progress(self, db_session: Session, job_id, flavor, uncompressed_bytes, compressed_bytes):
        """Internal helper to flush industrial progress to the Job record."""
        try:
            from sqlalchemy import text
            from apps.api.models import Job
            
            job = db_session.query(Job).filter(Job.id == job_id).first()
            if job:
                # Use explicit schema qualification for SQL queries
                table_query = text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'staging'")
                tables = [row[0] for row in db_session.execute(table_query).fetchall()]
                
                current_profile = job.profile or {}
                if "restore_start_time" not in current_profile:
                    current_profile["restore_start_time"] = time.time()

                current_profile["metadata"] = {
                    "table_count": len(tables),
                    "data_processed_mb": round(uncompressed_bytes / (1024 * 1024), 2),
                    "compressed_processed_mb": round(compressed_bytes / (1024 * 1024), 2),
                    "flavor": flavor,
                    "status": "RESTORING_STREAM",
                    "live": True
                }
                job.profile = current_profile
                db_session.commit()
        except Exception as e:
            logger.error(f"Progress flush failed: {e}")
            raise RuntimeError(str(e))
