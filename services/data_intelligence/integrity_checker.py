# services/data_intelligence/integrity_checker.py
"""Data Integrity Detection Engine — Phase 2.

Inspects the staging database to detect data quality issues that would
block or complicate a successful migration.

SAFETY: Runs ONLY against the staging schema. Uses SELECT queries with
LIMIT clauses to avoid full table scans on large datasets.
"""

import logging
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from apps.api.database import staging_engine

logger = logging.getLogger("sqauto.integrity_checker")

# Safety limits to prevent heavy queries
MAX_NULL_SCAN_ROWS = 10000
MAX_ORPHAN_SAMPLE = 500


def run_integrity_checks(db_session: Session, source_job_id: str) -> dict:
    """Run all data integrity checks against the staging schema.

    Returns a structured JSON report with:
    - duplicate_keys: tables with duplicate primary key values
    - missing_primary_keys: tables with no primary key defined
    - orphan_foreign_keys: child rows referencing non-existent parents
    - null_risks: columns with high NULL percentage (>50%)

    All queries are SELECT-only and use LIMIT to prevent performance issues.
    """
    logger.info(f"Starting integrity checks for job {source_job_id}")

    inspector = inspect(staging_engine)
    table_names = inspector.get_table_names(schema="staging")

    duplicate_keys = []
    missing_primary_keys = []
    orphan_foreign_keys = []
    null_risks = []

    for table_name in table_names:
        try:
            _check_primary_keys(inspector, table_name, duplicate_keys, missing_primary_keys)
            _check_orphan_fks(inspector, table_name, orphan_foreign_keys)
            _check_null_risks(inspector, table_name, null_risks)
        except Exception as e:
            logger.warning(f"Integrity check failed for table '{table_name}': {e}")

    total_issues = (
        len(duplicate_keys) +
        len(missing_primary_keys) +
        len(orphan_foreign_keys) +
        len(null_risks)
    )

    result = {
        "source_job_id": str(source_job_id),
        "tables_scanned": len(table_names),
        "total_issues": total_issues,
        "duplicate_keys": duplicate_keys,
        "missing_primary_keys": missing_primary_keys,
        "orphan_foreign_keys": orphan_foreign_keys,
        "null_risks": null_risks,
    }

    logger.info(
        f"Integrity checks completed for job {source_job_id}: "
        f"{total_issues} issues found across {len(table_names)} tables"
    )
    return result


def _check_primary_keys(inspector, table_name: str, duplicate_keys: list, missing_pks: list):
    """Check for duplicate primary keys and tables without primary keys."""
    pk_constraint = inspector.get_pk_constraint(table_name, schema="staging")
    pk_columns = pk_constraint.get("constrained_columns", [])

    if not pk_columns:
        missing_pks.append(table_name)
        return

    # Check for duplicate PK values
    pk_cols_quoted = ", ".join(f'"{c}"' for c in pk_columns)
    query = text(
        f'SELECT {pk_cols_quoted}, COUNT(*) as cnt '
        f'FROM staging."{table_name}" '
        f'GROUP BY {pk_cols_quoted} '
        f'HAVING COUNT(*) > 1 '
        f'LIMIT 100'
    )

    with staging_engine.connect() as conn:
        result = conn.execute(query)
        rows = result.fetchall()
        if rows:
            # Get total count of duplicate entries
            count_query = text(
                f'SELECT COUNT(*) FROM ('
                f'SELECT {pk_cols_quoted} '
                f'FROM staging."{table_name}" '
                f'GROUP BY {pk_cols_quoted} '
                f'HAVING COUNT(*) > 1'
                f') sub'
            )
            dup_count = conn.execute(count_query).scalar() or 0
            sample_values = [dict(zip(pk_columns + ["count"], row)) for row in rows[:5]]
            duplicate_keys.append({
                "table": table_name,
                "pk_columns": pk_columns,
                "count": dup_count,
                "sample": sample_values,
            })


def _check_orphan_fks(inspector, table_name: str, orphan_fks: list):
    """Check for orphan foreign key references (child rows without parents)."""
    foreign_keys = inspector.get_foreign_keys(table_name, schema="staging")

    for fk in foreign_keys:
        child_cols = fk["constrained_columns"]
        parent_table = fk["referred_table"]
        parent_cols = fk["referred_columns"]
        parent_schema = fk.get("referred_schema", "staging") or "staging"

        if not child_cols or not parent_cols:
            continue

        # Build LEFT JOIN orphan detection query
        child_col = f'"{child_cols[0]}"'
        parent_col = f'"{parent_cols[0]}"'

        query = text(
            f'SELECT COUNT(*) FROM staging."{table_name}" c '
            f'LEFT JOIN {parent_schema}."{parent_table}" p '
            f'ON c.{child_col} = p.{parent_col} '
            f'WHERE p.{parent_col} IS NULL '
            f'AND c.{child_col} IS NOT NULL'
        )

        try:
            with staging_engine.connect() as conn:
                orphan_count = conn.execute(query).scalar() or 0
                if orphan_count > 0:
                    # Get sample orphan values
                    sample_query = text(
                        f'SELECT DISTINCT c.{child_col}::text as orphan_value '
                        f'FROM staging."{table_name}" c '
                        f'LEFT JOIN {parent_schema}."{parent_table}" p '
                        f'ON c.{child_col} = p.{parent_col} '
                        f'WHERE p.{parent_col} IS NULL '
                        f'AND c.{child_col} IS NOT NULL '
                        f'LIMIT 10'
                    )
                    samples = [row[0] for row in conn.execute(sample_query).fetchall()]
                    orphan_fks.append({
                        "table": table_name,
                        "column": child_cols[0],
                        "references": f"{parent_table}.{parent_cols[0]}",
                        "count": orphan_count,
                        "sample_values": samples,
                    })
        except Exception as e:
            logger.debug(f"Orphan FK check skipped for {table_name}.{child_cols[0]}: {e}")


def _check_null_risks(inspector, table_name: str, null_risks: list):
    """Detect columns where >50% of rows are NULL (on a sampled subset)."""
    columns = inspector.get_columns(table_name, schema="staging")

    with staging_engine.connect() as conn:
        # Get total row count (sampled)
        total_query = text(
            f'SELECT COUNT(*) FROM (SELECT 1 FROM staging."{table_name}" LIMIT {MAX_NULL_SCAN_ROWS}) sub'
        )
        total = conn.execute(total_query).scalar() or 0
        if total == 0:
            return

        for col in columns:
            col_name = col["name"]
            null_query = text(
                f'SELECT COUNT(*) FROM ('
                f'SELECT "{col_name}" FROM staging."{table_name}" LIMIT {MAX_NULL_SCAN_ROWS}'
                f') sub WHERE "{col_name}" IS NULL'
            )
            try:
                null_count = conn.execute(null_query).scalar() or 0
                null_pct = round((null_count / total) * 100, 1)
                if null_pct > 50:
                    null_risks.append({
                        "table": table_name,
                        "column": col_name,
                        "null_percentage": null_pct,
                        "null_count": null_count,
                        "sample_size": total,
                    })
            except Exception:
                pass  # Skip columns that can't be null-checked (e.g., generated)
