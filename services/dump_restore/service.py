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
        """Universal restore with 10GB safety guard and streaming decompression.
        """
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Dump file not found: {file_path}")

        flavor = self.detect_flavor(file_path)
        is_gz = file_path.lower().endswith(".gz")
        logger.info(f"Detected SQL flavor: {flavor} (Compressed: {is_gz}) for job {job_id}")

        db_url = settings.DATABASE_URL
        if "+psycopg" in db_url:
            db_url = db_url.replace("+psycopg", "")

        from sqlalchemy import text
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

        try:
            # 2. Prepare Command
            if flavor == "postgres":
                # Use -f - to read from stdin
                cmd = ["psql", db_url, "-c", "SET search_path TO staging;", "-f", "-", "--set", "ON_ERROR_STOP=1", "--quiet"]
            elif flavor == "mysql":
                # For MySQL we use pgloader. pgloader supports stdin via /dev/stdin or -
                cmd = ["pgloader", "--type", "mysql", "--with", "quote identifiers", "--set", "search_path='staging'", "-", db_url]
            else:
                raise ValueError(f"Unsupported SQL flavor: {flavor}")

            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
            
            # --- Industrial Streaming & 10GB Safety Guard ---
            MAX_BYTES = 10 * 1024 * 1024 * 1024 # 10GB limit
            uncompressed_bytes = 0
            compressed_bytes = 0
            last_sync_bytes = 0
            
            try:
                if is_gz:
                    import gzip
                    # Open raw file to track compressed progress via tell()
                    with open(file_path, "rb") as raw_f:
                        with gzip.open(raw_f, "rb") as gz_file:
                            while True:
                                chunk = gz_file.read(1024 * 1024 * 10) # 10MB chunks
                                if not chunk: break
                                
                                uncompressed_bytes += len(chunk)
                                compressed_bytes = raw_f.tell()
                                
                                if uncompressed_bytes > MAX_BYTES:
                                    process.kill()
                                    raise RuntimeError(f"10GB LIMIT EXCEEDED: Decompression rejected for safety. Industrial dumps must be under 10GB uncompressed.")
                                
                                process.stdin.write(chunk.decode('utf-8', errors='ignore'))
                                
                                # Parallel Sync: Flush to DB every 20MB processed
                                if uncompressed_bytes - last_sync_bytes > 20 * 1024 * 1024:
                                    self._flush_progress(db_session, job_id, flavor, uncompressed_bytes, compressed_bytes)
                                    last_sync_bytes = uncompressed_bytes
                else:
                    with open(file_path, "rb") as f:
                        while True:
                            chunk = f.read(1024 * 1024 * 10)
                            if not chunk: break
                            uncompressed_bytes += len(chunk)
                            compressed_bytes = uncompressed_bytes
                            process.stdin.write(chunk.decode('utf-8', errors='ignore'))
                            
                            if uncompressed_bytes - last_sync_bytes > 20 * 1024 * 1024:
                                self._flush_progress(db_session, job_id, flavor, uncompressed_bytes, compressed_bytes)
                                last_sync_bytes = uncompressed_bytes
                
                process.stdin.close()
            except Exception as e:
                process.kill()
                raise e
            
            # --- Industrial Monitoring Loop (Final Sync) ---
            import time
            while process.poll() is None:
                self._flush_progress(db_session, job_id, flavor, uncompressed_bytes, compressed_bytes)
                time.sleep(3) # Faster poll for fluid dashboard

            _, stderr = process.communicate()
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, cmd, stderr=stderr)

            logger.info(f"Industrial streaming restore completed for job {job_id} (Processed {uncompressed_bytes} bytes)")

    def _flush_progress(self, db_session: Session, job_id, flavor, uncompressed_bytes, compressed_bytes):
        """Internal helper to flush industrial progress to the Job record."""
        try:
            from sqlalchemy import text
            from apps.api.models import Job
            
            # Re-verify search path just in case of session resets
            db_session.execute(text("SET search_path TO public, staging"))
            
            job = db_session.query(Job).filter(Job.id == job_id).first()
            if job:
                table_query = text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'staging'")
                tables = [row[0] for row in db_session.execute(table_query).fetchall()]
                
                # --- Industrial Data Peeking ---
                live_chunks = []
                for table in tables[:10]: # Limit to first 10 discovered tables for performance
                    try:
                        # Grab 5 sample rows
                        sample_query = text(f'SELECT * FROM "staging"."{table}" LIMIT 5')
                        result = db_session.execute(sample_query)
                        rows = [dict(row._mapping) for row in result.fetchall()]
                        if rows:
                            live_chunks.append({
                                "table": table,
                                "rows": rows,
                                "count": len(rows)
                            })
                    except Exception as pe_err:
                        # Table might be locked or mid-migration
                        pass

                current_profile = job.profile or {}
                current_profile["metadata"] = {
                    "table_count": len(tables),
                    "total_rows": 0, # Could be calculated later
                    "data_processed_mb": round(uncompressed_bytes / (1024 * 1024), 2),
                    "compressed_processed_mb": round(compressed_bytes / (1024 * 1024), 2),
                    "flavor": flavor,
                    "status": "RESTORING_STREAM"
                }
                current_profile["live_chunks"] = live_chunks
                job.profile = current_profile
                db_session.commit()
                # logger.debug(f"Piping Sync: {current_profile['metadata']['data_processed_mb']}MB")
        except Exception as e:
            error_msg = f"Industrial Restoration failed for job {job_id}: {str(e)}"
            logger.error(error_msg)
            # Re-raise or handle as needed
            raise RuntimeError(error_msg)
