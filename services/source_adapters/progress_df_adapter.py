# services/source_adapters/progress_df_adapter.py
"""Progress OpenEdge Source Adapter.

Parses Progress OpenEdge native dump files:
  - .df  → schema definition (ADD TABLE / ADD FIELD / ADD INDEX blocks)
  - .d   → pipe-delimited data files (one per table)
  - .zip → archive containing any mix of .df and .d files

Normalizes everything into the PostgreSQL 'staging' schema so all
downstream SQAuto tools (Explorer, Graph, Quality Check, Export,
Comparison) work without any modification.
"""

from __future__ import annotations

import logging
import os
import re
import time
import zipfile
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from services.source_adapters.base import BaseSourceAdapter

logger = logging.getLogger("sqauto.source_adapters.progress")

# ------------------------------------------------------------------
# Progress → PostgreSQL type mapping
# ------------------------------------------------------------------
PROGRESS_TYPE_MAP: dict[str, str] = {
    "integer":     "INTEGER",
    "int64":       "BIGINT",
    "character":   "TEXT",
    "char":        "TEXT",
    "decimal":     "NUMERIC",
    "logical":     "BOOLEAN",
    "date":        "DATE",
    "datetime":    "TIMESTAMP",
    "datetime-tz": "TIMESTAMPTZ",
    "recid":       "BIGINT",
    "rowid":       "VARCHAR(20)",
    "raw":         "BYTEA",
    "blob":        "BYTEA",
    "clob":        "TEXT",
    "handle":      "TEXT",
    "com-handle":  "TEXT",
    "widget":      "TEXT",
    "memptr":      "BYTEA",
    "longchar":    "TEXT",
}


def _map_type(progress_type: str) -> str:
    """Map a Progress data type string to a PostgreSQL type."""
    return PROGRESS_TYPE_MAP.get(progress_type.lower().strip(), "TEXT")


# ------------------------------------------------------------------
# .df Parser — converts Progress schema format to an internal dict
# ------------------------------------------------------------------

class DFParser:
    """Parses a Progress .df file into a structured schema dict.

    Returns:
        {
          "TableName": {
            "dump_name": "tablename",   # used to locate .d file
            "fields": [
              {"name": "FieldName", "type": "TEXT", "position": 1,
               "mandatory": False, "label": "...", "initial": None}
            ],
            "primary_keys": ["FieldName"],
            "unique_indexes": [["FieldA", "FieldB"]],
          }
        }
    """

    def parse(self, df_text: str) -> dict[str, Any]:
        tables: dict[str, Any] = {}
        current_table: str | None = None
        current_field: dict | None = None
        current_index: dict | None = None
        in_add_field = False
        in_add_index = False

        for raw_line in df_text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            upper = line.upper()

            # ---- ADD TABLE ----
            if upper.startswith("ADD TABLE "):
                m = re.match(r'ADD TABLE\s+"([^"]+)"', line, re.IGNORECASE)
                if m:
                    current_table = m.group(1)
                    tables[current_table] = {
                        "dump_name": current_table.lower(),
                        "fields": [],
                        "primary_keys": [],
                        "unique_indexes": [],
                        "_field_map": {},  # name → index in fields list
                    }
                    current_field = None
                    current_index = None
                    in_add_field = False
                    in_add_index = False
                continue

            if current_table is None:
                continue

            tbl = tables[current_table]

            # ---- DUMP-NAME ----
            if upper.startswith("DUMP-NAME "):
                m = re.match(r'DUMP-NAME\s+"([^"]+)"', line, re.IGNORECASE)
                if m:
                    tbl["dump_name"] = m.group(1)
                continue

            # ---- ADD FIELD ----
            if upper.startswith("ADD FIELD "):
                in_add_field = True
                in_add_index = False
                # Commit previous field if any
                if current_field:
                    _register_field(tbl, current_field)

                m = re.match(
                    r'ADD FIELD\s+"([^"]+)"\s+OF\s+"([^"]+)"\s+AS\s+(\S+)',
                    line, re.IGNORECASE
                )
                if m:
                    current_field = {
                        "name": m.group(1),
                        "type": _map_type(m.group(3)),
                        "progress_type": m.group(3).lower(),
                        "position": 9999,
                        "mandatory": False,
                        "label": None,
                        "initial": None,
                        "format": None,
                    }
                continue

            # ---- ADD INDEX ----
            if upper.startswith("ADD INDEX "):
                in_add_index = True
                in_add_field = False
                if current_field:
                    _register_field(tbl, current_field)
                    current_field = None

                m = re.match(r'ADD INDEX\s+"([^"]+)"\s+ON\s+"([^"]+)"', line, re.IGNORECASE)
                if m:
                    current_index = {
                        "name": m.group(1),
                        "primary": False,
                        "unique": False,
                        "fields": [],
                    }
                continue

            # ---- Field attributes ----
            if in_add_field and current_field:
                if upper.startswith("POSITION "):
                    m = re.match(r"POSITION\s+(\d+)", line, re.IGNORECASE)
                    if m:
                        current_field["position"] = int(m.group(1))
                elif upper.startswith("LABEL "):
                    m = re.match(r'LABEL\s+"([^"]*)"', line, re.IGNORECASE)
                    if m:
                        current_field["label"] = m.group(1)
                elif upper.startswith("MANDATORY"):
                    current_field["mandatory"] = True
                elif upper.startswith("FORMAT "):
                    m = re.match(r'FORMAT\s+"([^"]*)"', line, re.IGNORECASE)
                    if m:
                        current_field["format"] = m.group(1)
                elif upper.startswith("INITIAL "):
                    m = re.match(r'INITIAL\s+"([^"]*)"', line, re.IGNORECASE)
                    if m:
                        current_field["initial"] = m.group(1)
                continue

            # ---- Index attributes ----
            if in_add_index and current_index is not None:
                if upper.startswith("PRIMARY"):
                    current_index["primary"] = True
                elif upper.startswith("UNIQUE"):
                    current_index["unique"] = True
                elif upper.startswith("FIELD "):
                    m = re.match(r'FIELD\s+"([^"]+)"', line, re.IGNORECASE)
                    if m:
                        current_index["fields"].append(m.group(1))

                # Flush index when we see the next block or end
                if upper.startswith("ADD ") and not upper.startswith("ADD FIELD") and not upper.startswith("ADD INDEX") and not upper.startswith("ADD TABLE"):
                    _register_index(tbl, current_index)
                    current_index = None
                    in_add_index = False
                continue

        # Flush final field/index
        if current_field and current_table and current_table in tables:
            _register_field(tables[current_table], current_field)
        if current_index and current_table and current_table in tables:
            _register_index(tables[current_table], current_index)

        # Sort fields by position
        for tbl in tables.values():
            tbl["fields"].sort(key=lambda f: f.get("position", 9999))
            # Remove internal _field_map
            tbl.pop("_field_map", None)

        return tables


def _register_field(tbl: dict, field: dict) -> None:
    tbl["fields"].append(field)
    tbl["_field_map"][field["name"].lower()] = len(tbl["fields"]) - 1


def _register_index(tbl: dict, index: dict) -> None:
    if not index or not index["fields"]:
        return
    if index["primary"]:
        tbl["primary_keys"] = index["fields"]
    elif index["unique"]:
        tbl["unique_indexes"].append(index["fields"])


# ------------------------------------------------------------------
# .d File Parser — pipe-delimited data rows
# ------------------------------------------------------------------

class DDataParser:
    """Parses a Progress .d (data dump) file.

    Format: pipe-delimited rows, each ending with a lone '.' on the last field.
    Example:
        1|Smith|john@example.com|2023-01-01|.
        2|Jones|jane@example.com|2023-01-02|.

    Returns a list of raw string lists (one per row).
    """

    def parse(self, d_text: str, field_count: int) -> list[list[str | None]]:
        rows: list[list[str | None]] = []
        for raw_line in d_text.splitlines():
            line = raw_line.rstrip("\r\n")
            if not line:
                continue
            # Strip trailing pipe + dot record terminator
            if line.endswith("|."):
                line = line[:-2]
            elif line.endswith(".") and "|" in line:
                line = line[:-1].rstrip("|")

            parts = line.split("|")

            # Pad or truncate to expected field count
            while len(parts) < field_count:
                parts.append(None)
            parts = parts[:field_count]

            # Convert Progress special values
            coerced: list[str | None] = []
            for val in parts:
                if val is None or val == "?" or val == "":
                    coerced.append(None)
                else:
                    coerced.append(val)
            rows.append(coerced)
        return rows


# ------------------------------------------------------------------
# Main Adapter
# ------------------------------------------------------------------

class ProgressDFAdapter(BaseSourceAdapter):
    """Source adapter for Progress OpenEdge .df + .d dump files.

    Accepts:
      - A .zip archive containing .df and .d files
      - A single .df file (schema-only, no data)

    Loading process:
      1. Extract/read the .df schema file → parse into table definitions
      2. Wipe and recreate 'staging' schema in PostgreSQL
      3. CREATE TABLE for each Progress table (mapping types)
      4. For each .d file found, INSERT rows into the corresponding table
      5. Report progress to job.profile during loading
    """

    def detect_flavor(self, file_path: str) -> str:
        return "progress_openedge"

    def restore(self, *, job_id, file_path: str, db_session: Session) -> None:
        from apps.api.database import StagingSession
        from apps.api.models import Job
        from sqlalchemy.orm.attributes import flag_modified

        logger.info(f"[ProgressDFAdapter] Starting restore for job {job_id}: {file_path}")

        # ---- 1. Extract files from zip or read .df directly ----
        df_text: str | None = None
        d_files: dict[str, str] = {}  # dump_name (lowercase) → text content

        try:
            if file_path.lower().endswith(".zip"):
                df_text, d_files = self._extract_zip(file_path)
            elif file_path.lower().endswith(".df"):
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    df_text = f.read()
            else:
                raise ValueError(f"ProgressDFAdapter cannot handle file: {file_path}")
        except Exception as e:
            self._fail_job(db_session, job_id, f"Failed to read source file: {e}")
            raise

        if not df_text:
            self._fail_job(db_session, job_id, "No .df schema file found in the archive.")
            raise RuntimeError("No .df schema file found.")

        # ---- 2. Parse schema ----
        parser = DFParser()
        try:
            schema = parser.parse(df_text)
            logger.info(f"[ProgressDFAdapter] Parsed {len(schema)} tables from .df for job {job_id}")
        except Exception as e:
            self._fail_job(db_session, job_id, f"Failed to parse .df schema: {e}")
            raise

        if not schema:
            self._fail_job(db_session, job_id, "No tables found in .df file. Verify the file is a valid Progress schema dump.")
            raise RuntimeError("No tables found in .df schema.")

        # ---- 3. Wipe and recreate staging schema ----
        staging_db = StagingSession()
        try:
            staging_db.execute(text("DROP SCHEMA IF EXISTS staging CASCADE"))
            staging_db.execute(text("CREATE SCHEMA staging"))
            staging_db.commit()
            logger.info(f"[ProgressDFAdapter] Staging schema wiped for job {job_id}")
        except Exception as e:
            staging_db.rollback()
            self._fail_job(db_session, job_id, f"Failed to wipe staging schema: {e}")
            raise
        finally:
            staging_db.close()

        # ---- 4. Create tables and insert data ----
        data_parser = DDataParser()
        total_rows_loaded = 0
        tables_loaded = 0

        staging_db = StagingSession()
        try:
            for table_name, tbl_def in schema.items():
                safe_table = self._safe_identifier(table_name)
                fields = tbl_def["fields"]
                primary_keys = tbl_def.get("primary_keys", [])

                if not fields:
                    logger.warning(f"[ProgressDFAdapter] Table {table_name} has no fields — skipping.")
                    continue

                # Build CREATE TABLE DDL
                col_defs = []
                for field in fields:
                    col_name = self._safe_identifier(field["name"])
                    pg_type = field["type"]
                    not_null = "NOT NULL" if field.get("mandatory") else ""
                    col_defs.append(f'    "{col_name}" {pg_type} {not_null}'.strip())

                # Add primary key constraint
                if primary_keys:
                    pk_cols = ", ".join(f'"{self._safe_identifier(k)}"' for k in primary_keys)
                    col_defs.append(f"    PRIMARY KEY ({pk_cols})")

                ddl = (
                    f'CREATE TABLE IF NOT EXISTS staging."{safe_table}" (\n'
                    + ",\n".join(col_defs)
                    + "\n);"
                )

                try:
                    staging_db.execute(text(ddl))
                    staging_db.commit()
                    tables_loaded += 1
                    logger.info(f"[ProgressDFAdapter] Created staging.\"{safe_table}\"")
                except Exception as e:
                    staging_db.rollback()
                    logger.warning(f"[ProgressDFAdapter] Could not create table {safe_table}: {e}")
                    continue

                # ---- Load data from matching .d file ----
                dump_name = tbl_def.get("dump_name", table_name.lower())
                d_content = (
                    d_files.get(dump_name)
                    or d_files.get(dump_name.lower())
                    or d_files.get(table_name.lower())
                )
                if not d_content:
                    logger.info(f"[ProgressDFAdapter] No .d file for table {table_name} (dump_name={dump_name}) — table will be empty.")
                    continue

                rows = data_parser.parse(d_content, len(fields))
                if not rows:
                    continue

                col_names = [f'"{self._safe_identifier(f["name"])}"' for f in fields]
                placeholders = ", ".join([f":v{i}" for i in range(len(fields))])
                insert_sql = (
                    f'INSERT INTO staging."{safe_table}" ({", ".join(col_names)}) '
                    f"VALUES ({placeholders})"
                )

                batch_size = 500
                for batch_start in range(0, len(rows), batch_size):
                    batch = rows[batch_start: batch_start + batch_size]
                    batch_params = []
                    for row in batch:
                        params = {}
                        for i, val in enumerate(row):
                            params[f"v{i}"] = self._coerce_value(val, fields[i])
                        batch_params.append(params)

                    try:
                        staging_db.execute(text(insert_sql), batch_params)
                        staging_db.commit()
                    except Exception as e:
                        staging_db.rollback()
                        logger.warning(f"[ProgressDFAdapter] Batch insert failed for {safe_table}: {e}")
                        break

                total_rows_loaded += len(rows)
                logger.info(f"[ProgressDFAdapter] Loaded {len(rows)} rows into staging.\"{safe_table}\"")

                # Progress telemetry every table
                self._flush_progress(db_session, job_id, tables_loaded, len(schema), total_rows_loaded)

        finally:
            staging_db.close()

        # ---- 5. Final metadata update ----
        try:
            job = db_session.query(Job).filter(Job.id == job_id).first()
            if job:
                current_profile = dict(job.profile) if job.profile else {}
                current_profile["metadata"] = {
                    "flavor": "progress_openedge",
                    "source_type": "progress_openedge",
                    "table_count": tables_loaded,
                    "total_rows": total_rows_loaded,
                    "status": "RESTORE_COMPLETE",
                    "live": False,
                    "data_processed_mb": 0,
                }
                job.profile = current_profile
                flag_modified(job, "profile")
                db_session.commit()
        except Exception as e:
            logger.warning(f"[ProgressDFAdapter] Could not write final metadata for job {job_id}: {e}")

        logger.info(
            f"[ProgressDFAdapter] Restore complete for job {job_id}: "
            f"{tables_loaded} tables, {total_rows_loaded} rows loaded."
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _extract_zip(self, zip_path: str) -> tuple[str | None, dict[str, str]]:
        """Extract .df and .d file contents from a ZIP archive."""
        df_text: str | None = None
        d_files: dict[str, str] = {}

        with zipfile.ZipFile(zip_path, "r") as zf:
            for name in zf.namelist():
                basename = os.path.basename(name)
                ext = os.path.splitext(basename)[1].lower()
                if ext == ".df":
                    with zf.open(name) as f:
                        df_text = f.read().decode("utf-8", errors="ignore")
                elif ext == ".d":
                    dump_name = os.path.splitext(basename)[0].lower()
                    with zf.open(name) as f:
                        d_files[dump_name] = f.read().decode("utf-8", errors="ignore")

        logger.info(
            f"[ProgressDFAdapter] ZIP extracted: df={'yes' if df_text else 'NO'}, "
            f"d_files={list(d_files.keys())}"
        )
        return df_text, d_files

    def _safe_identifier(self, name: str) -> str:
        """Sanitize a Progress identifier for use as a PostgreSQL identifier."""
        # Replace spaces and hyphens with underscores, strip quotes
        return re.sub(r"[^a-zA-Z0-9_]", "_", name.strip().strip('"'))

    def _coerce_value(self, val: str | None, field: dict) -> Any:
        """Convert a raw .d string value to a Python type suitable for psycopg."""
        if val is None or val == "?":
            return None
        pg_type = field["type"].upper()
        try:
            if pg_type in ("INTEGER", "BIGINT"):
                return int(val)
            if pg_type == "NUMERIC":
                return float(val)
            if pg_type == "BOOLEAN":
                return val.lower() in ("yes", "true", "1", "y")
        except (ValueError, AttributeError):
            pass
        return val

    def _flush_progress(
        self,
        db_session: Session,
        job_id: Any,
        tables_done: int,
        tables_total: int,
        rows_loaded: int,
    ) -> None:
        """Write live progress to job.profile (non-fatal)."""
        try:
            from apps.api.models import Job
            from sqlalchemy.orm.attributes import flag_modified

            job = db_session.query(Job).filter(Job.id == job_id).first()
            if job:
                current_profile = dict(job.profile) if job.profile else {}
                current_profile["metadata"] = {
                    "flavor": "progress_openedge",
                    "source_type": "progress_openedge",
                    "table_count": tables_done,
                    "total_rows": rows_loaded,
                    "status": f"LOADING ({tables_done}/{tables_total} tables)",
                    "live": True,
                }
                job.profile = current_profile
                flag_modified(job, "profile")
                db_session.commit()
        except Exception as e:
            logger.warning(f"[ProgressDFAdapter] Progress flush failed (non-fatal): {e}")
            try:
                db_session.rollback()
            except Exception:
                pass

    def _fail_job(self, db_session: Session, job_id: Any, message: str) -> None:
        """Mark the job as failed with an error message."""
        try:
            from apps.api.models import Job
            db_session.query(Job).filter(Job.id == job_id).update(
                {"status": "failed", "log": message}
            )
            db_session.commit()
        except Exception as e:
            logger.error(f"[ProgressDFAdapter] Could not fail job {job_id}: {e}")
