import logging
import re
import time
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from apps.api.models import Job, MigrationLog, MigrationLogLevel, MigrationRun, MigrationRunStatus, MigrationTarget
from services.export_engine.service import ExportEngineService
from services.migration_engine.service import MigrationEngineService

logger = logging.getLogger("sqauto.migration_simulator")


class SimulationEngineService:
    def __init__(self) -> None:
        self.export_engine = ExportEngineService()
        self.connection_tester = MigrationEngineService()

    def run_simulation(self, run_id: uuid.UUID, job_id: uuid.UUID, target_id: uuid.UUID, db_session: Session, debug_keep_schema: bool = False):
        run = db_session.query(MigrationRun).filter(MigrationRun.id == run_id).first()
        job = db_session.query(Job).filter(Job.id == job_id).first()
        target = db_session.query(MigrationTarget).filter(MigrationTarget.id == target_id).first()
        if not run or not job or not target:
            logger.error("Simulation aborted due to missing run/job/target")
            return

        run.status = MigrationRunStatus.RUNNING
        run.started_at = datetime.utcnow()
        db_session.commit()
        self._log(db_session, run, MigrationLogLevel.INFO, None, "Simulation started")

        target_config = {
            "host": target.host,
            "port": target.port,
            "database_name": target.database_name,
            "username": target.username,
            "password": target.password,
            "ssl_mode": target.ssl_mode,
            "db_type": target.db_type or "postgresql",
        }

        conn_test = self.connection_tester.test_connection(target_config)
        if not conn_test.get("success"):
            summary = {
                "status": "failed",
                "error_type": conn_test.get("error_type", "connection_failed"),
                "message": conn_test.get("error") or "Unable to connect to target database",
                "sql_source": None,
                "tables_total": 0,
                "tables_success": 0,
                "tables_failed": 0,
                "rows_expected": 0,
                "rows_inserted": 0,
                "diff": {"missing_rows": 0, "extra_rows": 0},
                "errors": [conn_test.get("error") or "Connection failed"],
                "warnings": [],
                "execution_time": "0s",
                "table_results": [],
                "schema_name": None,
            }
            self._finalize_run(db_session, run, MigrationRunStatus.FAILED, summary)
            return

        target_db_type = (target.db_type or "postgresql").lower()
        if target_db_type != "postgresql":
            summary = {
                "status": "failed",
                "error_type": "unsupported_target_type",
                "message": f"Simulation currently supports PostgreSQL destinations only. Received {target_db_type}.",
                "sql_source": None,
                "tables_total": 0,
                "tables_success": 0,
                "tables_failed": 0,
                "rows_expected": 0,
                "rows_inserted": 0,
                "diff": {"missing_rows": 0, "extra_rows": 0},
                "errors": [f"Unsupported target type: {target_db_type}"],
                "warnings": [],
                "execution_time": "0s",
                "table_results": [],
                "schema_name": None,
            }
            self._finalize_run(db_session, run, MigrationRunStatus.FAILED, summary)
            return

        try:
            sql_payload = self.get_simulation_sql(job, db_session, target_db_type)
        except Exception as exc:
            summary = {
                "status": "failed",
                "error_type": "sql_source_missing",
                "message": str(exc),
                "sql_source": None,
                "tables_total": 0,
                "tables_success": 0,
                "tables_failed": 0,
                "rows_expected": 0,
                "rows_inserted": 0,
                "diff": {"missing_rows": 0, "extra_rows": 0},
                "errors": [str(exc)],
                "warnings": [],
                "execution_time": "0s",
                "table_results": [],
                "schema_name": None,
            }
            self._finalize_run(db_session, run, MigrationRunStatus.FAILED, summary)
            return

        schema_name = f"simulation_{str(job.id).replace('-', '')[:12]}_{int(time.time())}"
        statements = self._split_sql_statements(sql_payload["sql"])
        schema_statements, data_statements = self._partition_statements(statements)
        table_expectations = self._expected_table_rows(job)
        warnings: list[str] = []
        errors: list[str] = []
        statement_errors_by_table: dict[str, list[str]] = {}
        started_at = time.perf_counter()
        engine = self._build_target_engine(target_config)

        try:
            with engine.connect() as conn:
                conn.execute(text(f'CREATE SCHEMA "{schema_name}"'))
                conn.commit()
                self._log(db_session, run, MigrationLogLevel.INFO, None, f'Temporary schema "{schema_name}" created')

                for statement in schema_statements:
                    self._execute_statement(conn, self._rewrite_sql_for_schema(statement, schema_name), statement_errors_by_table, warnings, errors)
                for statement in data_statements:
                    self._execute_statement(conn, self._rewrite_sql_for_schema(statement, schema_name), statement_errors_by_table, warnings, errors)

                table_results = []
                rows_expected = sum(table_expectations.values())
                rows_inserted = 0
                tables_success = 0
                tables_failed = 0
                for table_name, expected_rows in table_expectations.items():
                    actual_rows = 0
                    table_errors = statement_errors_by_table.get(table_name, [])
                    status = "success"
                    try:
                        actual_rows = int(conn.execute(text(f'SELECT COUNT(*) FROM "{schema_name}"."{table_name}"')).scalar() or 0)
                    except Exception as exc:
                        table_errors.append(str(exc))
                        status = "failed"
                    if table_errors:
                        status = "failed" if actual_rows == 0 else "partial"
                    elif actual_rows != expected_rows:
                        status = "partial"
                    if status == "success":
                        tables_success += 1
                    else:
                        tables_failed += 1
                    rows_inserted += actual_rows
                    table_results.append(
                        {
                            "table": table_name,
                            "expected_rows": expected_rows,
                            "inserted_rows": actual_rows,
                            "status": status,
                            "errors": table_errors[:10],
                        }
                    )

                if not debug_keep_schema:
                    conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
                    conn.commit()
                    self._log(db_session, run, MigrationLogLevel.INFO, None, f'Temporary schema "{schema_name}" dropped')
                else:
                    warnings.append(f'Temporary schema "{schema_name}" retained for debugging.')

        except Exception as exc:
            errors.append(str(exc))
            table_results = []
            rows_expected = sum(table_expectations.values())
            rows_inserted = 0
            tables_success = 0
            tables_failed = len(table_expectations)
        finally:
            engine.dispose()

        execution_seconds = max(0.01, time.perf_counter() - started_at)
        missing_rows = max(0, rows_expected - rows_inserted)
        extra_rows = max(0, rows_inserted - rows_expected)
        if errors and tables_success == 0:
            status = "failed"
            run_status = MigrationRunStatus.FAILED
        elif errors or missing_rows or extra_rows or tables_failed:
            status = "partial"
            run_status = MigrationRunStatus.COMPLETED
        else:
            status = "success"
            run_status = MigrationRunStatus.COMPLETED

        summary = {
            "status": status,
            "sql_source": sql_payload["source"],
            "tables_total": len(table_expectations),
            "tables_success": tables_success,
            "tables_failed": tables_failed,
            "rows_expected": rows_expected,
            "rows_inserted": rows_inserted,
            "diff": {
                "missing_rows": missing_rows,
                "extra_rows": extra_rows,
            },
            "errors": errors[:20],
            "warnings": warnings[:20],
            "execution_time": self._format_duration(execution_seconds),
            "table_results": table_results,
            "schema_name": schema_name if debug_keep_schema else None,
        }
        self._finalize_run(db_session, run, run_status, summary)

    def get_simulation_sql(self, job: Job, db_session: Session, target_dialect: str) -> dict[str, str]:
        profile = job.profile or {}
        artifacts = profile.get("export_artifacts") or {}
        manual = (artifacts.get("manual_edits_version") or {}).get("sql")
        if manual:
            return {"sql": manual, "source": "manual"}

        translated_versions = artifacts.get("translated_sql_version") or {}
        translated = (translated_versions.get(target_dialect) or {}).get("sql")
        if translated:
            return {"sql": translated, "source": "translated"}

        clean = (artifacts.get("cleaned_sql_version") or {}).get("sql")
        if clean:
            return {"sql": clean, "source": "clean"}

        if target_dialect != "postgresql":
            artifact = self.export_engine.build_export(
                job=job,
                db_session=db_session,
                target_dialect=target_dialect,
                export_mode="full",
                override_validation=True,
            )
            self.export_engine._store_artifact(
                job,
                db_session,
                artifact_kind="translated-sql",
                target_dialect=artifact.target_dialect,
                export_mode=artifact.mode,
                sql=artifact.sql,
                validation=artifact.validation,
                warnings=artifact.warnings,
                auto_fixes=artifact.auto_fixes_applied,
            )
            return {"sql": artifact.sql, "source": "translated"}

        artifact = self.export_engine.build_export(
            job=job,
            db_session=db_session,
            target_dialect="postgresql",
            export_mode="full",
            override_validation=True,
        )
        self.export_engine._store_artifact(
            job,
            db_session,
            artifact_kind="clean-sql",
            target_dialect=artifact.target_dialect,
            export_mode=artifact.mode,
            sql=artifact.sql,
            validation=artifact.validation,
            warnings=artifact.warnings,
            auto_fixes=artifact.auto_fixes_applied,
        )
        return {"sql": artifact.sql, "source": "clean"}

    def _expected_table_rows(self, job: Job) -> dict[str, int]:
        profile_tables = ((job.profile or {}).get("tables") or {}) if job.profile else {}
        expected = {}
        for table_name, table_meta in profile_tables.items():
            row_count = table_meta.get("row_count")
            if row_count is None:
                row_count = table_meta.get("rows")
            expected[table_name] = int(row_count or 0)
        return expected

    def _build_target_engine(self, config: dict):
        ssl_mode = config.get("ssl_mode", "prefer")
        url = (
            f"postgresql+psycopg://{config['username']}:{config['password']}"
            f"@{config['host']}:{config['port']}/{config['database_name']}"
            f"?sslmode={ssl_mode}"
        )
        return create_engine(url, connect_args={"connect_timeout": 15}, echo=False, future=True)

    def _split_sql_statements(self, sql: str) -> list[str]:
        statements = []
        current = []
        in_single = False
        in_double = False
        prev = ""
        for char in sql:
            if char == "'" and not in_double and prev != "\\":
                in_single = not in_single
            elif char == '"' and not in_single and prev != "\\":
                in_double = not in_double
            if char == ";" and not in_single and not in_double:
                statement = "".join(current).strip()
                if statement:
                    statements.append(statement)
                current = []
            else:
                current.append(char)
            prev = char
        tail = "".join(current).strip()
        if tail:
            statements.append(tail)
        return statements

    def _partition_statements(self, statements: list[str]) -> tuple[list[str], list[str]]:
        schema_statements = []
        data_statements = []
        for statement in statements:
            normalized = statement.strip().lower()
            if normalized.startswith("insert into") or normalized.startswith("copy "):
                data_statements.append(statement)
            else:
                schema_statements.append(statement)
        return schema_statements, data_statements

    def _rewrite_sql_for_schema(self, statement: str, schema_name: str) -> str:
        rewritten = re.sub(r'\bpublic\.', f'"{schema_name}".', statement)
        rewritten = re.sub(r'\bstaging\.', f'"{schema_name}".', rewritten)
        if rewritten.lstrip().upper().startswith("CREATE TABLE ") and f'"{schema_name}".' not in rewritten:
            rewritten = re.sub(r'CREATE TABLE\s+"?([A-Za-z0-9_]+)"?', rf'CREATE TABLE "{schema_name}"."\1"', rewritten, count=1, flags=re.IGNORECASE)
        if rewritten.lstrip().upper().startswith("INSERT INTO ") and f'"{schema_name}".' not in rewritten:
            rewritten = re.sub(r'INSERT INTO\s+"?([A-Za-z0-9_]+)"?', rf'INSERT INTO "{schema_name}"."\1"', rewritten, count=1, flags=re.IGNORECASE)
        if rewritten.lstrip().upper().startswith("ALTER TABLE ") and f'"{schema_name}".' not in rewritten:
            rewritten = re.sub(r'ALTER TABLE\s+"?([A-Za-z0-9_]+)"?', rf'ALTER TABLE "{schema_name}"."\1"', rewritten, count=1, flags=re.IGNORECASE)
        return rewritten

    def _table_from_statement(self, statement: str) -> str | None:
        patterns = [
            r'create table\s+(?:"?[a-zA-Z0-9_]+"?\.)?"?([a-zA-Z0-9_]+)"?',
            r'insert into\s+(?:"?[a-zA-Z0-9_]+"?\.)?"?([a-zA-Z0-9_]+)"?',
            r'alter table\s+(?:"?[a-zA-Z0-9_]+"?\.)?"?([a-zA-Z0-9_]+)"?',
        ]
        lowered = statement.lower()
        for pattern in patterns:
            match = re.search(pattern, lowered, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _execute_statement(self, conn, statement: str, errors_by_table: dict[str, list[str]], warnings: list[str], errors: list[str]):
        table_name = self._table_from_statement(statement)
        try:
            conn.execute(text(statement))
            conn.commit()
        except Exception as exc:
            conn.rollback()
            message = str(exc)
            if table_name:
                errors_by_table.setdefault(table_name, []).append(message)
            errors.append(message)
            if table_name:
                warnings.append(f"Statement failed for table {table_name}.")

    def _format_duration(self, seconds: float) -> str:
        total = max(0, int(seconds))
        mins, secs = divmod(total, 60)
        return f"{mins}m {secs}s" if mins else f"{secs}s"

    def _log(self, db_session: Session, run: MigrationRun, level: MigrationLogLevel, table_name: str | None, message: str):
        entry = MigrationLog(
            project_id=run.project_id,
            migration_run_id=run.id,
            level=level,
            table_name=table_name,
            message=message,
            transaction_status="simulated",
        )
        db_session.add(entry)
        db_session.commit()

    def _finalize_run(self, db_session: Session, run: MigrationRun, status: MigrationRunStatus, summary: dict[str, Any]):
        run.status = status
        run.finished_at = datetime.utcnow()
        run.summary = summary
        db_session.commit()
        level = MigrationLogLevel.INFO if status == MigrationRunStatus.COMPLETED else MigrationLogLevel.ERROR
        self._log(db_session, run, level, None, f"Simulation finished with status {summary.get('status')}")
